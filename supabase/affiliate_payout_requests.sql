-- Affiliate payout requests (run in Supabase SQL Editor after affiliate_program.sql).

create table if not exists public.affiliate_payout_requests (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id text not null references public.affiliates (user_id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  payment_method text not null check (payment_method in ('paypal', 'venmo')),
  payment_handle text not null,
  preferred_currency text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now()
);

create index if not exists affiliate_payout_requests_affiliate_idx
  on public.affiliate_payout_requests (affiliate_user_id, created_at desc);

create index if not exists affiliate_payout_requests_status_idx
  on public.affiliate_payout_requests (status, created_at desc);

comment on table public.affiliate_payout_requests is 'Affiliate cash-out requests; amount_cents is USD cents at time of request';
