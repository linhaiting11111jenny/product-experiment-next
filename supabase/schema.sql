create extension if not exists pgcrypto;

create table if not exists public.experiment_events (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  uid text not null,
  condition text not null,
  event text not null,
  elapsed_seconds integer,
  load_more_clicks integer default 0,
  review_panel_viewed boolean default false,
  return_url_present boolean default false,
  review_open_elapsed_seconds integer,
  review_visible_seconds integer,
  visible_seconds integer,
  hidden_seconds integer,
  max_scroll_percent integer,
  visible_review_count integer,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists experiment_events_created_at_idx
  on public.experiment_events (created_at desc);

create index if not exists experiment_events_uid_idx
  on public.experiment_events (uid);

create or replace function public.get_experiment_event_counts()
returns table(event text, count bigint)
language sql
security definer
as $$
  select event, count(*)::bigint as count
  from public.experiment_events
  group by event
  order by event asc;
$$;
