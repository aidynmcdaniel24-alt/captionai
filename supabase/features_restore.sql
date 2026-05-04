-- CaptionAI feature restore — run in Supabase SQL Editor after step3 + caption_history + step5.
-- Safe to re-run: uses IF NOT EXISTS / IF NOT EXISTS patterns where possible.

create extension if not exists "pgcrypto";

-- ── caption_history: language tag for generations ───────────────────────────
alter table public.caption_history
  add column if not exists language text not null default 'English';

-- ── Favorites: star a specific line inside a history batch ───────────────────
create table if not exists public.caption_favorites (
  user_id text not null,
  history_id uuid not null references public.caption_history (id) on delete cascade,
  caption_index int not null check (caption_index >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, history_id, caption_index)
);

create index if not exists caption_favorites_user_idx on public.caption_favorites (user_id);

-- ── Ratings: worst / medium / best per caption line ─────────────────────────
create table if not exists public.caption_ratings (
  user_id text not null,
  history_id uuid not null references public.caption_history (id) on delete cascade,
  caption_index int not null check (caption_index >= 0),
  rating text not null check (rating in ('worst', 'medium', 'best')),
  updated_at timestamptz not null default now(),
  primary key (user_id, history_id, caption_index)
);

create index if not exists caption_ratings_user_idx on public.caption_ratings (user_id);

-- ── Referrals ───────────────────────────────────────────────────────────────
create table if not exists public.referral_codes (
  user_id text primary key,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_claims (
  id uuid primary key default gen_random_uuid (),
  referrer_user_id text not null,
  referred_user_id text not null unique,
  code text not null,
  created_at timestamptz not null default now()
);

create index if not exists referral_claims_referrer_idx on public.referral_claims (referrer_user_id);

-- ── A/B caption experiments ───────────────────────────────────────────────────
create table if not exists public.ab_experiments (
  id uuid primary key default gen_random_uuid (),
  user_id text not null,
  label text,
  variant_a text not null,
  variant_b text not null,
  picks_a int not null default 0,
  picks_b int not null default 0,
  platform text,
  created_at timestamptz not null default now()
);

create index if not exists ab_experiments_user_idx on public.ab_experiments (user_id, created_at desc);

-- ── Admin / audit logs (viewed in admin dashboard) ───────────────────────────
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid (),
  level text not null default 'info' check (level in ('info', 'warn', 'error')),
  message text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_logs_created_idx on public.admin_logs (created_at desc);
create index if not exists admin_logs_level_idx on public.admin_logs (level, created_at desc);
