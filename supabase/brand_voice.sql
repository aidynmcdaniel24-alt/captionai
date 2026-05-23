-- Run in Supabase SQL Editor after COMPLETE_SETUP.sql
-- Stores per-user brand voice profile. The generate API reads this and adds
-- it to the AI prompt when present, so captions always match the brand.

create extension if not exists "pgcrypto";

create table if not exists public.brand_voice (
  user_id text primary key,
  brand_name text not null default '',
  description text not null default '',
  personality text[] not null default '{}',
  words_to_use text not null default '',
  words_to_avoid text not null default '',
  example_caption text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists brand_voice_updated_idx
  on public.brand_voice (updated_at desc);
