create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  height_cm numeric(5, 1) not null check (height_cm between 80 and 250),
  current_weight_kg numeric(6, 1) not null check (current_weight_kg between 25 and 350),
  goal_weight_kg numeric(6, 1) not null check (goal_weight_kg between 25 and 350),
  goal_duration_days integer not null check (goal_duration_days between 14 and 3650),
  daily_calorie_target integer not null check (daily_calorie_target between 1200 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
