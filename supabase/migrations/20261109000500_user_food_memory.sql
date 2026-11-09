alter table public.profiles
  add column if not exists food_memory_enabled boolean not null default false;

create table if not exists public.food_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  canonical_name text not null check (char_length(canonical_name) between 1 and 100),
  serving_description text not null check (char_length(trim(serving_description)) between 1 and 100),
  calories integer not null check (calories between 0 and 20000),
  protein_g numeric(7,1) not null check (protein_g between 0 and 1000),
  carbs_g numeric(7,1) not null check (carbs_g between 0 and 1000),
  fat_g numeric(7,1) not null check (fat_g between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, canonical_name)
);

create index if not exists food_memory_user_idx on public.food_memory(user_id);
alter table public.food_memory enable row level security;
grant select, insert, update, delete on public.food_memory to authenticated;

create policy "Users can view their own food memory" on public.food_memory for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add their own food memory" on public.food_memory for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own food memory" on public.food_memory for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own food memory" on public.food_memory for delete to authenticated using ((select auth.uid()) = user_id);
