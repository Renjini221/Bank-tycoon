begin;
create table public.bank_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision >= 1),
  state jsonb not null check (jsonb_typeof(state) = 'object')
);
alter table public.bank_saves enable row level security;
revoke all on table public.bank_saves from public, anon, authenticated;
grant select, insert, update on table public.bank_saves to authenticated;
create policy own_bank_read on public.bank_saves for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_bank_insert on public.bank_saves for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy own_bank_update on public.bank_saves for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
commit;
