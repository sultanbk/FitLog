create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  age_years smallint not null check (age_years between 18 and 100),
  sex text not null check (sex in ('female', 'male')),
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'active')),
  height_cm numeric(5, 1) not null check (height_cm between 80 and 250),
  current_weight_kg numeric(6, 1) not null check (current_weight_kg between 25 and 350),
  goal_weight_kg numeric(6, 1) not null check (goal_weight_kg between 25 and 350),
  goal_duration_days integer not null check (goal_duration_days between 14 and 3650),
  daily_calorie_target integer not null check (daily_calorie_target between 1 and 20000),
  maintenance_calories integer check (maintenance_calories between 1 and 20000),
  protein_g_per_kg numeric(2, 1) not null default 1.5 check (protein_g_per_kg between 1.2 and 2.0),
  food_memory_enabled boolean not null default false,
  gemini_food_parsing_enabled boolean not null default false,
  gemini_weekly_reflections_enabled boolean not null default false,
  gemini_meal_ideas_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric(6, 1) not null check (weight_kg between 25 and 350),
  created_at timestamptz not null default now()
);

create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  exercise text not null default 'push-ups' check (exercise = 'push-ups'),
  repetitions integer not null check (repetitions between 1 and 10000),
  created_at timestamptz not null default now()
);

create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  meal text not null check (meal in ('breakfast', 'lunch', 'snack', 'dinner')),
  calories integer not null check (calories between 0 and 20000),
  protein_g numeric(7,1) not null default 0 check (protein_g between 0 and 1000),
  carbs_g numeric(7,1) not null default 0 check (carbs_g between 0 and 1000),
  fat_g numeric(7,1) not null default 0 check (fat_g between 0 and 1000),
  is_guessed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.food_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  canonical_name text not null check (char_length(canonical_name) between 1 and 100),
  canonical_serving text not null check (char_length(canonical_serving) between 1 and 100),
  serving_description text not null check (char_length(trim(serving_description)) between 1 and 100),
  calories integer not null check (calories between 0 and 20000),
  protein_g numeric(7,1) not null check (protein_g between 0 and 1000),
  carbs_g numeric(7,1) not null check (carbs_g between 0 and 1000),
  fat_g numeric(7,1) not null check (fat_g between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, canonical_name, canonical_serving)
);

create table public.quick_adds (
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

create index food_entries_user_date_meal_idx on public.food_entries (user_id, entry_date, meal, created_at);
create index food_memory_user_idx on public.food_memory (user_id);
create index quick_adds_user_created_at_idx on public.quick_adds (user_id, created_at desc);

create index weigh_ins_user_created_at_idx on public.weigh_ins (user_id, created_at desc);
create index exercise_logs_user_date_created_at_idx on public.exercise_logs (user_id, entry_date, created_at desc);

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

alter table public.weigh_ins enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.food_entries enable row level security;
alter table public.food_memory enable row level security;
alter table public.quick_adds enable row level security;
grant select, insert on public.weigh_ins to authenticated;
grant select, insert, delete on public.exercise_logs to authenticated;
grant select, insert, update, delete on public.food_entries to authenticated;
grant select, insert, update, delete on public.food_memory to authenticated;
grant select, insert, update, delete on public.quick_adds to authenticated;

create policy "Users can view their own weigh-ins"
  on public.weigh_ins for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own weigh-ins"
  on public.weigh_ins for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can view their own exercise logs"
  on public.exercise_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can add their own exercise logs"
  on public.exercise_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own exercise logs"
  on public.exercise_logs for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own food entries"
  on public.food_entries for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own food entries"
  on public.food_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own food entries"
  on public.food_entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own food entries"
  on public.food_entries for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own food memory"
  on public.food_memory for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own food memory"
  on public.food_memory for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own food memory"
  on public.food_memory for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own food memory"
  on public.food_memory for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own quick adds"
  on public.quick_adds for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can add their own quick adds"
  on public.quick_adds for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own quick adds"
  on public.quick_adds for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own quick adds"
  on public.quick_adds for delete to authenticated
  using ((select auth.uid()) = user_id);
