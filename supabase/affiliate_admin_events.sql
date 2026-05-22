-- Affiliate per-event logging for /admin Affiliate tab.
-- Run in Supabase SQL Editor after affiliate_program.sql.

create table if not exists public.affiliate_click_events (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id text not null,
  code text not null,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_click_events_created_at_idx
  on public.affiliate_click_events (created_at desc);

create index if not exists affiliate_click_events_affiliate_idx
  on public.affiliate_click_events (affiliate_user_id, created_at desc);

alter table public.affiliate_lead_conversion_credited
  add column if not exists affiliate_user_id text,
  add column if not exists commission_cents int,
  add column if not exists is_test boolean not null default false;

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

-- Optional: remove a mistaken test commission (e.g. $1.80 = 180 cents) after Stripe test checkout.
-- Replace LEAD_USER_ID with the Clerk user id that completed test checkout.
/*
update public.affiliate_stats s
   set earnings_cents = greatest(0, s.earnings_cents - 180),
       paying_customers = greatest(0, s.paying_customers - 1),
       updated_at = now()
  from public.affiliate_lead_conversion_credited c
 where c.lead_user_id = 'LEAD_USER_ID'
   and c.is_test = false
   and c.commission_cents = 180
   and s.affiliate_user_id = c.affiliate_user_id;

delete from public.affiliate_lead_conversion_credited where lead_user_id = 'LEAD_USER_ID';
*/
