-- Run in Supabase SQL Editor if you already applied an older affiliate_program.sql
-- (adds column aliases + replaces increment_affiliate_clicks to take user id).

alter table public.affiliates
  add column if not exists affiliate_code text generated always as (code) stored;

alter table public.affiliates
  add column if not exists affiliate_user_id text generated always as (user_id) stored;

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
