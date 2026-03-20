import { NextResponse } from "next/server";

import { persistEvent } from "@/lib/experiment-store";
import { normalizeCondition } from "@/lib/reviews";

export const runtime = "nodejs";

interface TrackPayload {
  sessionId?: string;
  uid?: string;
  condition?: string;
  event?:
    | "page_view"
    | "view_reviews"
    | "load_more"
    | "page_hidden"
    | "page_visible"
    | "session_end";
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
}

export async function POST(request: Request) {
  const body = (await request.json()) as TrackPayload;

  if (!body.event) {
    return NextResponse.json({ ok: false, error: "Missing event" }, { status: 400 });
  }

  await persistEvent({
    sessionId: body.sessionId,
    uid: body.uid?.trim() || "匿名用户",
    condition: normalizeCondition(body.condition),
    event: body.event,
    elapsedSeconds: body.elapsedSeconds,
    loadMoreClicks: body.loadMoreClicks ?? 0,
    reviewPanelViewed: body.reviewPanelViewed ?? false,
    returnUrlPresent: body.returnUrlPresent ?? false,
    reviewOpenElapsedSeconds: body.reviewOpenElapsedSeconds,
    reviewVisibleSeconds: body.reviewVisibleSeconds,
    visibleSeconds: body.visibleSeconds,
    hiddenSeconds: body.hiddenSeconds,
    maxScrollPercent: body.maxScrollPercent,
    visibleReviewCount: body.visibleReviewCount,
    userAgent: request.headers.get("user-agent") ?? undefined,
    createdAt: new Date().toISOString()
  });

  return NextResponse.json({ ok: true });
}
