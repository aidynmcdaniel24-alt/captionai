-- CaptionAI — June 2026 feature tables
-- Run in Supabase SQL Editor after COMPLETE_SETUP.sql
--
-- Includes:
--   1. caption_copies  (Feature 9 — Caption Memory)
--   2. brand_voice     (Feature 12 — Brand Tone Profiles)
--   3. Annual plan support note for subscriptions.plan

create extension if not exists "pgcrypto";

-- ─── Feature 9: Caption Memory ───────────────────────────────────────────────
-- Tracks every caption a Pro/Annual user copies so we can personalize
-- analytics, best-time suggestions, and topic/platform preferences.

create table if not exists public.caption_copies (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  caption_text text not null,
  platform text,
  tone text,
  topic text,
  score int4,
  copied_at timestamptz not null default now()
);

create index if not exists caption_copies_user_idx
  on public.caption_copies (user_id, copied_at desc);

create index if not exists caption_copies_user_platform_idx
  on public.caption_copies (user_id, platform);

create index if not exists caption_copies_user_tone_idx
  on public.caption_copies (user_id, tone);

-- ─── Feature 12: Brand Tone Profiles (Annual) ────────────────────────────────
-- One brand voice profile per user. Applied automatically during caption
-- generation for Annual subscribers.

create table if not exists public.brand_voice (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  brand_name text,
  personality jsonb not null default '[]'::jsonb,
  words_to_use jsonb not null default '[]'::jsonb,
  words_to_avoid jsonb not null default '[]'::jsonb,
  example_caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brand_voice_user_idx
  on public.brand_voice (user_id);

-- ─── Plan tier note ──────────────────────────────────────────────────────────
-- subscriptions.plan now accepts three values: 'free', 'pro', 'annual'.
-- Annual is set automatically by the Stripe webhook when billing_interval=year.
-- Existing monthly subscribers remain on plan='pro'.
-- No schema change required — plan is already a text column.

-- Optional: backfill existing yearly Stripe subscribers to annual
-- (run manually if you have subscribers who paid annual before this migration)
-- update public.subscriptions set plan = 'annual', updated_at = now()
-- where plan = 'pro' and user_id in (...);
