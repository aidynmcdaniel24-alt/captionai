-- ============================================================================
-- CaptionAI — notification_emails table
-- ============================================================================
-- Tracks transactional notifications we send to users so we can dedupe and
-- enforce a maximum send rate. Currently used by the "your caption scored 80+"
-- celebration email (one per user per UTC day).
--
-- Safe to re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

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
