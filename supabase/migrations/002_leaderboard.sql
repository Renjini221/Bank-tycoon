begin;

create table if not exists public.year_end_scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bank_name text not null,
  equity_paise bigint not null check (equity_paise between -9007199254740991 and 9007199254740991)
);
create index if not exists year_end_scores_equity on public.year_end_scores(equity_paise desc, user_id);
alter table public.year_end_scores enable row level security;
revoke all on public.year_end_scores from public, anon, authenticated;

-- Read the calling player's final balance sheet. The client supplies no score.
create or replace function public.post_year_end_score()
returns void language plpgsql security definer set search_path = '' as $$
declare
  player uuid := auth.uid();
  game jsonb;
  score bigint;
  display_name text;
begin
  if player is null then raise exception 'Log in to post a score.'; end if;
  select s.state->'game' into game from public.bank_saves s where s.user_id = player for share;
  if game is null or not (game @> '{"outcome":"completed","day":360,"settled":360}'::jsonb) then
    raise exception 'Survive all 360 days and sync your final bank before posting.';
  end if;
  if jsonb_typeof(game->'cash') is distinct from 'number'
     or jsonb_typeof(game->'loans') is distinct from 'array'
     or jsonb_typeof(game->'accounts') is distinct from 'array' then
    raise exception 'The final balance sheet is incomplete.';
  end if;
  select (game->>'cash')::bigint
    + (select coalesce(sum((l->>'remaining')::bigint),0) from jsonb_array_elements(game->'loans') l)
    - (select coalesce(sum(a::bigint),0) from jsonb_array_elements_text(game->'accounts') a)
    - coalesce((game->>'currentBalance')::bigint,0)
    - (select coalesce(sum((c->>'balance')::bigint),0) from jsonb_array_elements(game->'contracts') c)
    into score;
  select left(coalesce(nullif(trim(u.raw_user_meta_data->>'bank_name'), ''), 'Kochi Bank'), 48)
    into display_name from auth.users u where u.id = player;
  insert into public.year_end_scores(user_id,bank_name,equity_paise)
    values(player,display_name,score)
    on conflict (user_id) do update
      set equity_paise = excluded.equity_paise, bank_name = excluded.bank_name
      where excluded.equity_paise > year_end_scores.equity_paise;
end;
$$;

create or replace function public.get_year_end_leaderboard()
returns table(place bigint, bank_name text, equity_paise bigint, is_you boolean)
language sql stable security definer set search_path = '' as $$
  with ranked as (
    select s.user_id, s.bank_name, s.equity_paise,
      rank() over (order by s.equity_paise desc) as place,
      row_number() over (order by s.equity_paise desc, s.user_id) as position
    from public.year_end_scores s
  )
  select r.place, r.bank_name, r.equity_paise, coalesce(r.user_id = auth.uid(), false)
  from ranked r where r.position <= 25 or r.user_id = auth.uid()
  order by r.position;
$$;

revoke all on function public.post_year_end_score() from public, anon, authenticated;
grant execute on function public.post_year_end_score() to authenticated;
revoke all on function public.get_year_end_leaderboard() from public, anon, authenticated;
grant execute on function public.get_year_end_leaderboard() to anon, authenticated;
notify pgrst, 'reload schema';
commit;
