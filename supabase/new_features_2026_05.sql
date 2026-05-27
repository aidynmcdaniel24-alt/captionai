-- ============================================================================
-- CaptionAI — combined migration for the new feature batch
-- ============================================================================
-- Run this once in the Supabase SQL editor (or via `psql`). It bundles every
-- new piece of schema introduced by the latest feature set:
--
--   1. notification_emails — score celebration / future transactional emails
--   2. ab_experiments — winner / metric / style columns + constraints
--
-- Every statement is idempotent so re-running is safe.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── 1) notification_emails ────────────────────────────────────────────────
create table if not exists public.notification_emails (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  caption_text text not null,
  score int not null check (score >= 0 and score <= 100),
  kind text not null default 'high_score',
  sent_at timestamptz not null default now()
);

create index if not exists notification_emails_user_kind_sent_at_idx
  on public.notification_emails (user_id, kind, sent_at desc);

create index if not exists notification_emails_sent_at_idx
  on public.notification_emails (sent_at desc);

-- ─── 2) ab_experiments winner tracking ─────────────────────────────────────
alter table public.ab_experiments
  add column if not exists style_a text,
  add column if not exists style_b text,
  add column if not exists winner text,
  add column if not exists winner_metric text,
  add column if not exists winner_style text,
  add column if not exists winner_recorded_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ab_experiments_winner_check'
  ) then
    alter table public.ab_experiments
      add constraint ab_experiments_winner_check
      check (winner is null or winner in ('a', 'b'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ab_experiments_winner_metric_check'
  ) then
    alter table public.ab_experiments
      add constraint ab_experiments_winner_metric_check
      check (
        winner_metric is null
        or winner_metric in ('likes', 'comments', 'shares', 'profile_visits', 'reach')
      );
  end if;
end$$;

create index if not exists ab_experiments_winner_style_idx
  on public.ab_experiments (user_id, winner_style)
  where winner_style is not null;
