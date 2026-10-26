create table if not exists public.orders (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

revoke all on table public.orders from anon;
grant select, insert, update, delete on table public.orders to authenticated;

drop policy if exists "Team members can manage orders" on public.orders;
create policy "Team members can manage orders"
  on public.orders
  for all
  to authenticated
  using (true)
  with check (true);
