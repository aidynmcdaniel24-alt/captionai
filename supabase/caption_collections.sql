-- CaptionAI — Caption Collections (Pro feature, run after COMPLETE_SETUP.sql).
--
-- Lets Pro users group their saved/favorite captions into named collections
-- like "Instagram Posts", "TikTok Ideas", "Product Launches", etc.

create extension if not exists "pgcrypto";

create table if not exists public.caption_collections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists caption_collections_user_idx
  on public.caption_collections (user_id, created_at desc);

create unique index if not exists caption_collections_user_name_unique
  on public.caption_collections (user_id, lower(name));

create table if not exists public.caption_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.caption_collections (id) on delete cascade,
  user_id text not null,
  caption_text text not null,
  platform text,
  tone text,
  topic text,
  created_at timestamptz not null default now()
);

create index if not exists caption_collection_items_collection_idx
  on public.caption_collection_items (collection_id, created_at desc);

create index if not exists caption_collection_items_user_idx
  on public.caption_collection_items (user_id, created_at desc);
