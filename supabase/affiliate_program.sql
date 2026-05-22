-- Affiliate program tables + RPCs (run in Supabase SQL Editor after base schema).
-- Migrates data from referral_codes / referral_claims when present.
-- affiliate_stats uses affiliate_user_id (FK → affiliates.user_id), not user_id.

create table if not exists public.affiliates (
  user_id text primary key,
  code text not null unique,
  created_at timestamptz not null default now()
);

-- Aliases for API / PostgREST (same data as user_id + code)
alter table public.affiliates
  add column if not exists affiliate_code text generated always as (code) stored;

alter table public.affiliates
  add column if not exists affiliate_user_id text generated always as (user_id) stored;

create table if not exists public.affiliate_stats (
  affiliate_user_id text primary key references public.affiliates (user_id) on delete cascade,
  clicks int not null default 0,
  signups int not null default 0,
  paying_customers int not null default 0,
  earnings_cents int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_signup_attributions (
  lead_user_id text primary key,
  affiliate_user_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_signup_attributions_affiliate_idx
  on public.affiliate_signup_attributions (affiliate_user_id);

-- One-time credit per paying lead when attributions rows have no conversion columns (see record_affiliate_first_conversion).
create table if not exists public.affiliate_lead_conversion_credited (
  lead_user_id text primary key,
  created_at timestamptz not null default now()
);

-- Columns used by the 3-arg record_affiliate_first_conversion (see affiliate_admin_events.sql).
alter table public.affiliate_lead_conversion_credited
  add column if not exists affiliate_user_id text,
  add column if not exists commission_cents int,
  add column if not exists is_test boolean not null default false;

-- Increment clicks by affiliate user id (row must exist; API upserts first).
create or replace function public.increment_affiliate_clicks (p_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.affiliate_stats
     set clicks = clicks + 1,
         updated_at = now()
   where affiliate_user_id = p_user_id;
end;
$$;

-- Remove any legacy 2-arg signature so overloading does not shadow the canonical 3-arg version below.
drop function if exists public.record_affiliate_first_conversion (text, int);

-- First paid subscription for a lead → commission + stats (idempotent via affiliate_lead_conversion_credited)
create or replace function public.record_affiliate_first_conversion (
  p_lead_user_id text,
  p_commission_cents int,
  p_is_test boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affiliate_user_id text;
  v_inserted int;
begin
  if p_is_test or coalesce(p_commission_cents, 0) <= 0 then
    return false;
  end if;

  select a.affiliate_user_id
    into v_affiliate_user_id
    from public.affiliate_signup_attributions a
   where a.lead_user_id = p_lead_user_id;

  if v_affiliate_user_id is null then
    return false;
  end if;

  insert into public.affiliate_lead_conversion_credited (
    lead_user_id,
    affiliate_user_id,
    commission_cents,
    is_test
  )
  values (p_lead_user_id, v_affiliate_user_id, p_commission_cents, false)
  on conflict (lead_user_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  insert into public.affiliate_stats (affiliate_user_id, paying_customers, earnings_cents)
  values (v_affiliate_user_id, 1, p_commission_cents)
  on conflict (affiliate_user_id) do update set
    paying_customers = public.affiliate_stats.paying_customers + 1,
    earnings_cents = public.affiliate_stats.earnings_cents + excluded.earnings_cents,
    updated_at = now();

  return true;
end;
$$;

-- New referral signup counted toward affiliate
create or replace function public.increment_affiliate_signup (p_affiliate_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.affiliate_stats (affiliate_user_id, signups)
  values (p_affiliate_user_id, 1)
  on conflict (affiliate_user_id) do update set
    signups = public.affiliate_stats.signups + 1,
    updated_at = now();
end;
$$;

-- Migrate legacy referral tables (safe if empty or already migrated)
insert into public.affiliates (user_id, code, created_at)
select rc.user_id, rc.code, rc.created_at
  from public.referral_codes rc
 on conflict (user_id) do nothing;

insert into public.affiliate_stats (affiliate_user_id)
select a.user_id from public.affiliates a
 on conflict (affiliate_user_id) do nothing;

insert into public.affiliate_signup_attributions (
  affiliate_user_id,
  lead_user_id,
  created_at
)
select rc.referrer_user_id,
       rc.referred_user_id,
       rc.created_at
  from public.referral_claims rc
 on conflict (lead_user_id) do nothing;

-- Backfill counters from attributions (optional repair)
update public.affiliate_stats s
   set signups = coalesce (sub.c, 0),
       updated_at = now ()
  from (
         select affiliate_user_id,
                count (*)::int as c
           from public.affiliate_signup_attributions
          group by affiliate_user_id
       ) sub
 where s.affiliate_user_id = sub.affiliate_user_id
   and coalesce (s.signups, 0) < coalesce (sub.c, 0);

alter table public.caption_history
  add column if not exists ai_ratings jsonb;
