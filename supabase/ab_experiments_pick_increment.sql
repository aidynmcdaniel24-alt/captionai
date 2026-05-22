-- Atomic pick counter for ab_experiments (avoids the read-then-update race in /api/ab-test).
-- Run in Supabase SQL Editor.

create or replace function public.increment_ab_pick (
  p_id uuid,
  p_user_id text,
  p_pick text
)
returns table (picks_a int, picks_b int)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pick = 'a' then
    return query
    update public.ab_experiments
       set picks_a = picks_a + 1
     where id = p_id
       and user_id = p_user_id
    returning ab_experiments.picks_a, ab_experiments.picks_b;
  elsif p_pick = 'b' then
    return query
    update public.ab_experiments
       set picks_b = picks_b + 1
     where id = p_id
       and user_id = p_user_id
    returning ab_experiments.picks_a, ab_experiments.picks_b;
  end if;
end;
$$;
