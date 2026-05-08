-- Replace RPCs if your affiliate_stats PK column is affiliate_user_id (not user_id).
-- Column names: clicks, signups, paying_customers (see affiliate_program.sql).
-- Safe to run repeatedly (create or replace).

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
