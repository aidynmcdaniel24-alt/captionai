-- Run in Supabase SQL Editor after Step 3 schema.
-- Stores each successful caption generation batch per user.

create extension if not exists "pgcrypto";

create table if not exists public.caption_history (
  id uuid primary key default gen_random_uuid (),
  user_id text not null,
  topic text not null,
  platform text not null,
  tone text not null,
  captions jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists caption_history_user_created_idx
  on public.caption_history (user_id, created_at desc);
