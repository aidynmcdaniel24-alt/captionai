-- Replace RPCs if your affiliate_stats PK column is affiliate_user_id (not user_id).
-- Safe to run repeatedly (create or replace).

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
      insert into public.affiliate_stats (affiliate_user_id)
      values (v_uid)
      on conflict (affiliate_user_id) do nothing;
    end if;
  end if;
  if v_uid is null then
    return;
  end if;
  insert into public.affiliate_stats (affiliate_user_id, total_clicks)
  values (v_uid, 1)
  on conflict (affiliate_user_id) do update set
    total_clicks = public.affiliate_stats.total_clicks + 1,
    updated_at = now();
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

  insert into public.affiliate_stats (affiliate_user_id, total_paying, earnings_cents)
  values (v_referrer, 1, p_commission_cents)
  on conflict (affiliate_user_id) do update set
    total_paying = public.affiliate_stats.total_paying + 1,
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
  insert into public.affiliate_stats (affiliate_user_id, total_signups)
  values (p_referrer_user_id, 1)
  on conflict (affiliate_user_id) do update set
    total_signups = public.affiliate_stats.total_signups + 1,
    updated_at = now();
end;
$$;
