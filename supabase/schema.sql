-- Create orders table
create table if not exists public.orders (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.orders enable row level security;

-- Allow read, insert, update, and delete access using the project anon key (no staff passwords needed!)
drop policy if exists "Allow public access with anon key" on public.orders;
create policy "Allow public access with anon key"
  on public.orders
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Enable Realtime so all phones receive live order updates via WebSocket
alter publication supabase_realtime add table public.orders;
