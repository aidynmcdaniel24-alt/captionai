-- Run in Supabase SQL Editor after deploying Stripe portal code.
-- Stores Stripe Customer ID so users can open the Billing Portal from your app.

alter table public.subscriptions
  add column if not exists stripe_customer_id text;

comment on column public.subscriptions.stripe_customer_id is 'Stripe Customer ID (cus_...) for Billing Portal / subscription APIs';
