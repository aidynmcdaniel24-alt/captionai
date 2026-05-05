-- Affiliate program tables + RPCs (run in Supabase SQL Editor after base schema).
-- Migrates data from referral_codes / referral_claims when present.

create table if not exists public.affiliates (
  user_id text primary key,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_stats (
  user_id text primary key references public.affiliates (user_id) on delete cascade,
  total_clicks int not null default 0,
  total_signups int not null default 0,
  total_paying int not null default 0,
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

-- Atomic click tracking when someone visits /r/:code
create or replace function public.increment_affiliate_clicks (p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text;
  v_code text;
begin
  select user_id into v_uid from public.affiliates where lower (code) = lower (trim (p_code));
  if v_uid is null then
    select rc.user_id, rc.code
      into v_uid, v_code
      from public.referral_codes rc
     where lower (rc.code) = lower (trim (p_code))
     limit 1;
    if v_uid is not null then
      insert into public.affiliates (user_id, code)
      values (v_uid, v_code)
      on conflict (user_id) do nothing;
      insert into public.affiliate_stats (user_id)
      values (v_uid)
      on conflict (user_id) do nothing;
    end if;
  end if;
  if v_uid is null then
    return;
  end if;
  insert into public.affiliate_stats (user_id, total_clicks)
  values (v_uid, 1)
  on conflict (user_id) do update set
    total_clicks = public.affiliate_stats.total_clicks + 1,
    updated_at = now();
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

  insert into public.affiliate_stats (user_id, total_paying, earnings_cents)
  values (v_referrer, 1, p_commission_cents)
  on conflict (user_id) do update set
    total_paying = public.affiliate_stats.total_paying + 1,
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
  insert into public.affiliate_stats (user_id, total_signups)
  values (p_referrer_user_id, 1)
  on conflict (user_id) do update set
    total_signups = public.affiliate_stats.total_signups + 1,
    updated_at = now();
end;
$$;

-- Migrate legacy referral tables (safe if empty or already migrated)
insert into public.affiliates (user_id, code, created_at)
select rc.user_id, rc.code, rc.created_at
  from public.referral_codes rc
 on conflict (user_id) do nothing;

insert into public.affiliate_stats (user_id)
select a.user_id from public.affiliates a
 on conflict (user_id) do nothing;

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
   set total_signups = coalesce (sub.c, 0),
       updated_at = now ()
  from (
         select referrer_user_id,
                count (*)::int as c
           from public.affiliate_signup_attributions
          group by referrer_user_id
       ) sub
 where s.user_id = sub.referrer_user_id
   and coalesce (s.total_signups, 0) < coalesce (sub.c, 0);

alter table public.caption_history
  add column if not exists ai_ratings jsonb;
