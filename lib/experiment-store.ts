import { appendFile, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getSupabaseAdminClient, hasSupabaseConfig } from "@/lib/supabase";

export interface ExperimentEvent {
  sessionId?: string;
  uid: string;
  condition: string;
  event: "page_view" | "view_reviews" | "load_more" | "page_hidden" | "page_visible" | "session_end";
  elapsedSeconds?: number;
  loadMoreClicks?: number;
  reviewPanelViewed?: boolean;
  returnUrlPresent?: boolean;
  reviewOpenElapsedSeconds?: number;
  reviewVisibleSeconds?: number;
  visibleSeconds?: number;
  hiddenSeconds?: number;
  maxScrollPercent?: number;
  visibleReviewCount?: number;
  userAgent?: string;
  createdAt: string;
}

interface ExperimentSummary {
  totalEvents: number;
  totalParticipants: number;
  byEvent: Record<string, number>;
  lastEventAt: string | null;
  storageMode: "supabase" | "upstash" | "file";
}

const localDataDir = process.env.VERCEL ? path.join(os.tmpdir(), "product-experiment-next") : path.join(process.cwd(), "data");
const localDataFile = path.join(localDataDir, "experiment-events.jsonl");

const storagePrefix = process.env.EXPERIMENT_STORAGE_PREFIX?.trim() || "product-experiment";
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

function getStorageMode(): "supabase" | "upstash" | "file" {
  if (hasSupabaseConfig()) {
    return "supabase";
  }

  if (upstashUrl && upstashToken) {
    return "upstash";
  }

  return "file";
}

async function persistEventToSupabase(event: ExperimentEvent) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("experiment_events").insert({
    session_id: event.sessionId ?? null,
    uid: event.uid,
    condition: event.condition,
    event: event.event,
    elapsed_seconds: event.elapsedSeconds ?? null,
    load_more_clicks: event.loadMoreClicks ?? 0,
    review_panel_viewed: event.reviewPanelViewed ?? false,
    return_url_present: event.returnUrlPresent ?? false,
    review_open_elapsed_seconds: event.reviewOpenElapsedSeconds ?? null,
    review_visible_seconds: event.reviewVisibleSeconds ?? null,
    visible_seconds: event.visibleSeconds ?? null,
    hidden_seconds: event.hiddenSeconds ?? null,
    max_scroll_percent: event.maxScrollPercent ?? null,
    visible_review_count: event.visibleReviewCount ?? null,
    user_agent: event.userAgent ?? null,
    created_at: event.createdAt
  });

  if (error) {
    throw error;
  }
}

async function getSupabaseSummary(): Promise<ExperimentSummary> {
  const supabase = getSupabaseAdminClient();

  const [{ count: totalEvents, error: countError }, { data: participants, error: participantsError }, { data: grouped, error: groupedError }, { data: lastRecord, error: lastError }] =
    await Promise.all([
      supabase.from("experiment_events").select("*", { count: "exact", head: true }),
      supabase.from("experiment_events").select("uid"),
      supabase.rpc("get_experiment_event_counts"),
      supabase
        .from("experiment_events")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

  if (countError) {
    throw countError;
  }

  if (participantsError) {
    throw participantsError;
  }

  if (groupedError) {
    throw groupedError;
  }

  if (lastError) {
    throw lastError;
  }

  const byEvent = Array.isArray(grouped)
    ? grouped.reduce<Record<string, number>>((acc, row) => {
        const eventName = String((row as { event?: string }).event ?? "");
        const count = Number((row as { count?: number }).count ?? 0);
        if (eventName) {
          acc[eventName] = count;
        }
        return acc;
      }, {})
    : {};

  return {
    totalEvents: totalEvents ?? 0,
    totalParticipants: new Set((participants ?? []).map((item) => item.uid)).size,
    byEvent,
    lastEventAt: lastRecord?.created_at ?? null,
    storageMode: "supabase"
  };
}

async function callUpstashPipeline(commands: unknown[][]) {
  if (!upstashUrl || !upstashToken) {
    throw new Error("Missing Upstash configuration.");
  }

  const response = await fetch(`${upstashUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(commands),
    cache: "no-store"
  });

  const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>;

  if (!response.ok) {
    throw new Error(`Upstash pipeline failed with status ${response.status}`);
  }

  const errored = payload.find((item) => item.error);
  if (errored?.error) {
    throw new Error(errored.error);
  }

  return payload;
}

function getUpstashKeys() {
  return {
    events: `${storagePrefix}:events`,
    participants: `${storagePrefix}:participants`,
    counters: `${storagePrefix}:counters`,
    lastEventAt: `${storagePrefix}:last-event-at`
  };
}

async function persistEventToUpstash(event: ExperimentEvent) {
  const keys = getUpstashKeys();
  const serialized = JSON.stringify(event);

  await callUpstashPipeline([
    ["RPUSH", keys.events, serialized],
    ["SADD", keys.participants, event.uid],
    ["HINCRBY", keys.counters, "totalEvents", 1],
    ["HINCRBY", keys.counters, event.event, 1],
    ["SET", keys.lastEventAt, event.createdAt]
  ]);
}

async function getUpstashSummary(): Promise<ExperimentSummary> {
  const keys = getUpstashKeys();
  const [counterResponse, participantResponse, lastEventResponse] = await callUpstashPipeline([
    ["HGETALL", keys.counters],
    ["SCARD", keys.participants],
    ["GET", keys.lastEventAt]
  ]);

  const rawCounters = (counterResponse?.result ?? []) as string[];
  const byEvent: Record<string, number> = {};
  let totalEvents = 0;

  for (let index = 0; index < rawCounters.length; index += 2) {
    const key = rawCounters[index];
    const value = Number(rawCounters[index + 1] ?? 0);

    if (key === "totalEvents") {
      totalEvents = value;
      continue;
    }

    byEvent[key] = value;
  }

  return {
    totalEvents,
    totalParticipants: Number(participantResponse?.result ?? 0),
    byEvent,
    lastEventAt: (lastEventResponse?.result as string | null | undefined) ?? null,
    storageMode: "upstash"
  };
}

async function persistEventToFile(event: ExperimentEvent) {
  await mkdir(localDataDir, { recursive: true });
  await appendFile(localDataFile, `${JSON.stringify(event)}\n`, "utf8");
}

async function getFileSummary(): Promise<ExperimentSummary> {
  try {
    const raw = await readFile(localDataFile, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const parsed = lines.map((line) => JSON.parse(line) as ExperimentEvent);

    return {
      totalEvents: parsed.length,
      totalParticipants: new Set(parsed.map((item) => item.uid)).size,
      byEvent: parsed.reduce<Record<string, number>>((acc, item) => {
        acc[item.event] = (acc[item.event] ?? 0) + 1;
        return acc;
      }, {}),
      lastEventAt: parsed.at(-1)?.createdAt ?? null,
      storageMode: "file"
    };
  } catch {
    return {
      totalEvents: 0,
      totalParticipants: 0,
      byEvent: {},
      lastEventAt: null,
      storageMode: "file"
    };
  }
}

export async function persistEvent(event: ExperimentEvent) {
  if (getStorageMode() === "supabase") {
    await persistEventToSupabase(event);
    return;
  }

  if (getStorageMode() === "upstash") {
    await persistEventToUpstash(event);
    return;
  }

  await persistEventToFile(event);
}

export async function getStoredSummary() {
  if (getStorageMode() === "supabase") {
    return getSupabaseSummary();
  }

  if (getStorageMode() === "upstash") {
    return getUpstashSummary();
  }

  return getFileSummary();
}
