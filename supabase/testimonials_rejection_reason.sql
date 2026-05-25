-- Adds the AI-moderation rejection reason column for testimonials.
-- Run this once in the Supabase SQL Editor on existing projects.

alter table public.testimonials
  add column if not exists rejection_reason text;

comment on column public.testimonials.rejection_reason is
  'Populated when the AI auto-moderator rejects a submission. Stored alongside approved=false so admins can review the reason and override the decision.';

-- Helps the admin panel quickly fetch AI-rejected rows.
create index if not exists testimonials_rejected_idx
  on public.testimonials (created_at desc)
  where approved = false and rejection_reason is not null;
