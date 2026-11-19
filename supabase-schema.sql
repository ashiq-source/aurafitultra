-- AuraFit AI Ultra cloud sync schema. Run in Supabase SQL Editor.
create table if not exists public.aurafit_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_name text not null,
  record_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, store_name, record_id)
);
alter table public.aurafit_records enable row level security;
drop policy if exists "Users can read own AuraFit records" on public.aurafit_records;
create policy "Users can read own AuraFit records" on public.aurafit_records for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own AuraFit records" on public.aurafit_records;
create policy "Users can insert own AuraFit records" on public.aurafit_records for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own AuraFit records" on public.aurafit_records;
create policy "Users can update own AuraFit records" on public.aurafit_records for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own AuraFit records" on public.aurafit_records;
create policy "Users can delete own AuraFit records" on public.aurafit_records for delete to authenticated using (auth.uid() = user_id);
create index if not exists aurafit_records_user_store on public.aurafit_records(user_id, store_name);
