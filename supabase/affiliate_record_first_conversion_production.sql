-- Paste into Supabase SQL Editor (production / staging).
-- affiliate_signup_attributions: lead_user_id, affiliate_user_id, created_at only.
-- Conversion idempotency uses affiliate_lead_conversion_credited (one row per credited lead).

create table if not exists public.affiliate_lead_conversion_credited (
  lead_user_id text primary key,
  created_at timestamptz not null default now()
);

alter table public.affiliate_lead_conversion_credited
  add column if not exists affiliate_user_id text,
  add column if not exists commission_cents int,
  add column if not exists is_test boolean not null default false;

create unique index if not exists affiliate_signup_attributions_lead_user_id_key
  on public.affiliate_signup_attributions (lead_user_id);

drop function if exists public.record_affiliate_first_conversion (text, int);

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
