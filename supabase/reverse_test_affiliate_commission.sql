-- One-time fix: remove mistaken test-mode affiliate commission (e.g. $1.80 on $9 plan).
-- Run in Supabase SQL Editor. Replace LEAD_USER_ID with the Clerk user who paid in Stripe TEST mode.

-- 1) Find the lead and affiliate (preview):
-- select c.lead_user_id, c.affiliate_user_id, c.commission_cents, s.earnings_cents
--   from affiliate_lead_conversion_credited c
--   join affiliate_stats s on s.affiliate_user_id = c.affiliate_user_id
--  where c.lead_user_id = 'LEAD_USER_ID';

-- 2) Reverse 180 cents if that was the test checkout ($9 × 20%):
update public.affiliate_stats s
   set earnings_cents = greatest(0, s.earnings_cents - coalesce(c.commission_cents, 180)),
       paying_customers = greatest(0, s.paying_customers - 1),
       updated_at = now()
  from public.affiliate_lead_conversion_credited c
 where c.lead_user_id = 'LEAD_USER_ID'
   and s.affiliate_user_id = c.affiliate_user_id;

delete from public.affiliate_lead_conversion_credited where lead_user_id = 'LEAD_USER_ID';
