-- Testimonials submitted by signed-in users from the landing page.
-- Run in Supabase SQL Editor.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  title text not null,
  message text not null check (char_length(message) <= 200),
  rating int not null check (rating between 1 and 5),
  helpful_count int not null default 0 check (helpful_count >= 0),
  approved boolean not null default false,
  rejection_reason text,
  created_at timestamptz not null default now()
);

-- For projects created before AI auto-moderation existed.
alter table public.testimonials
  add column if not exists rejection_reason text;

create index if not exists testimonials_approved_idx
  on public.testimonials (approved, created_at desc);

create index if not exists testimonials_user_idx
  on public.testimonials (user_id, created_at desc);

create index if not exists testimonials_rejected_idx
  on public.testimonials (created_at desc)
  where approved = false and rejection_reason is not null;

comment on table public.testimonials is
  'User-submitted landing-page testimonials; require admin approval before they are publicly listed.';

-- Atomic helpful-count increment (used by POST /api/testimonials/:id/helpful)
create or replace function public.testimonials_increment_helpful(testimonial_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  update public.testimonials
     set helpful_count = helpful_count + 1
   where id = testimonial_id
     and approved = true
  returning helpful_count into new_count;

  return new_count;
end;
$$;

revoke all on function public.testimonials_increment_helpful(uuid) from public;
grant execute on function public.testimonials_increment_helpful(uuid) to service_role;

-- Atomic helpful-count decrement (clamped at zero).
-- Used by POST /api/testimonials/:id/helpful when toggling a "Helpful" vote off.
create or replace function public.testimonials_decrement_helpful(testimonial_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  update public.testimonials
     set helpful_count = greatest(0, helpful_count - 1)
   where id = testimonial_id
     and approved = true
  returning helpful_count into new_count;

  return new_count;
end;
$$;

revoke all on function public.testimonials_decrement_helpful(uuid) from public;
grant execute on function public.testimonials_decrement_helpful(uuid) to service_role;
