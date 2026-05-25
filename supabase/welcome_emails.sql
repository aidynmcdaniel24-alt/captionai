-- ============================================================================
-- CaptionAI — transactional email tracking
-- ============================================================================
-- Adds two timestamp columns to the `subscriptions` table so that the welcome
-- email and the Pro upgrade thank-you email are sent exactly once per user.
--
-- Run this in the Supabase SQL editor (or via `psql`) AFTER step3_schema.sql
-- and step5_stripe_portal.sql.
--
-- It is safe to re-run — every statement is idempotent.
-- ============================================================================

-- Welcome email (sent on first dashboard visit; nulls trigger a send).
alter table public.subscriptions
  add column if not exists welcome_email_sent_at timestamptz;

-- Pro upgrade thank-you email (sent from Stripe checkout.session.completed).
alter table public.subscriptions
  add column if not exists pro_email_sent_at timestamptz;

-- Optional index for analytics on welcome email send time.
create index if not exists subscriptions_welcome_email_sent_at_idx
  on public.subscriptions (welcome_email_sent_at);

-- Optional index for analytics on Pro upgrade thank-you email send time.
create index if not exists subscriptions_pro_email_sent_at_idx
  on public.subscriptions (pro_email_sent_at);
