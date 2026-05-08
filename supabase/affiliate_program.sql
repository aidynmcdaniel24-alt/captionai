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
  id uuid primary key default gen_random_uuid (),
  referrer_user_id text not null,
  referred_user_id text not null unique,
  code text not null,
  created_at timestamptz not null default now (),
  first_payment_at timestamptz,
  commission_total_cents int not null default 0
);

create index if not exists affiliate_signup_attributions_referrer_idx
  on public.affiliate_signup_attributions (referrer_user_id);

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

-- First paid subscription for a referred user → commission + stats (idempotent)
create or replace function public.record_affiliate_first_conversion (
  p_referred_user_id text,
  p_commission_cents int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer text;
begin
  select referrer_user_id
    into v_referrer
    from public.affiliate_signup_attributions
   where referred_user_id = p_referred_user_id
     and first_payment_at is null
   limit 1
   for update;

  if v_referrer is null then
    return false;
  end if;

  update public.affiliate_signup_attributions
     set first_payment_at = now (),
         commission_total_cents = p_commission_cents
   where referred_user_id = p_referred_user_id;

  insert into public.affiliate_stats (affiliate_user_id, paying_customers, earnings_cents)
  values (v_referrer, 1, p_commission_cents)
  on conflict (affiliate_user_id) do update set
    paying_customers = public.affiliate_stats.paying_customers + 1,
    earnings_cents = public.affiliate_stats.earnings_cents + excluded.earnings_cents,
    updated_at = now();

  return true;
end;
$$;

-- New referral signup counted toward affiliate
create or replace function public.increment_affiliate_signup (p_referrer_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.affiliate_stats (affiliate_user_id, signups)
  values (p_referrer_user_id, 1)
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
  referrer_user_id,
  referred_user_id,
  code,
  created_at
)
select rc.referrer_user_id,
       rc.referred_user_id,
       rc.code,
       rc.created_at
  from public.referral_claims rc
 on conflict (referred_user_id) do nothing;

-- Backfill counters from attributions (optional repair)
update public.affiliate_stats s
   set signups = coalesce (sub.c, 0),
       updated_at = now ()
  from (
         select referrer_user_id,
                count (*)::int as c
           from public.affiliate_signup_attributions
          group by referrer_user_id
       ) sub
 where s.affiliate_user_id = sub.referrer_user_id
   and coalesce (s.signups, 0) < coalesce (sub.c, 0);

alter table public.caption_history
  add column if not exists ai_ratings jsonb;
