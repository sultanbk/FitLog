create table if not exists public.quick_adds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  meal text not null check (meal in ('breakfast', 'lunch', 'snack', 'dinner')),
  calories integer not null check (calories between 0 and 20000),
  protein_g numeric(7,1) not null default 0 check (protein_g between 0 and 1000),
  carbs_g numeric(7,1) not null default 0 check (carbs_g between 0 and 1000),
  fat_g numeric(7,1) not null default 0 check (fat_g between 0 and 1000),
  is_guessed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists quick_adds_user_created_at_idx on public.quick_adds(user_id, created_at desc);
alter table public.quick_adds enable row level security;
grant select, insert, delete on public.quick_adds to authenticated;

create policy "Users can view their own quick adds" on public.quick_adds for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add their own quick adds" on public.quick_adds for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can delete their own quick adds" on public.quick_adds for delete to authenticated using ((select auth.uid()) = user_id);
