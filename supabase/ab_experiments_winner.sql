-- ============================================================================
-- CaptionAI — A/B winner tracking
-- ============================================================================
-- Adds the columns needed to mark which variant performed better after the
-- user has actually posted the A/B test, plus which engagement metric and
-- caption style won. The dashboard reads these columns to render the
-- "Past winners" insights section.
--
-- Safe to re-run — all statements are idempotent.
-- ============================================================================

alter table public.ab_experiments
  add column if not exists style_a text,
  add column if not exists style_b text,
  add column if not exists winner text,
  add column if not exists winner_metric text,
  add column if not exists winner_style text,
  add column if not exists winner_recorded_at timestamptz;

-- Constrain values written by the API. Using DO blocks so reruns don't fail
-- when the constraint already exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ab_experiments_winner_check'
  ) then
    alter table public.ab_experiments
      add constraint ab_experiments_winner_check
      check (winner is null or winner in ('a', 'b'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ab_experiments_winner_metric_check'
  ) then
    alter table public.ab_experiments
      add constraint ab_experiments_winner_metric_check
      check (
        winner_metric is null
        or winner_metric in ('likes', 'comments', 'shares', 'profile_visits', 'reach')
      );
  end if;
end$$;

create index if not exists ab_experiments_winner_style_idx
  on public.ab_experiments (user_id, winner_style)
  where winner_style is not null;
