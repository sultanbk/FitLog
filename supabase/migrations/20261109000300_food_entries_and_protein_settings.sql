alter table public.profiles
  add column if not exists maintenance_calories integer check (maintenance_calories between 1 and 20000),
  add column if not exists protein_g_per_kg numeric(2,1) not null default 1.5 check (protein_g_per_kg between 1.2 and 2.0);

update public.profiles
set maintenance_calories = round(
  (10 * current_weight_kg + 6.25 * height_cm - 5 * age_years + case when sex = 'male' then 5 else -161 end)
  * case activity_level when 'sedentary' then 1.2 when 'light' then 1.375 when 'moderate' then 1.55 else 1.725 end
)
where maintenance_calories is null and age_years is not null;

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  meal text not null check (meal in ('breakfast', 'lunch', 'snack', 'dinner')),
  calories integer not null check (calories between 0 and 20000),
  protein_g numeric(7,1) not null default 0 check (protein_g between 0 and 1000),
  carbs_g numeric(7,1) not null default 0 check (carbs_g between 0 and 1000),
  fat_g numeric(7,1) not null default 0 check (fat_g between 0 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists food_entries_user_date_meal_idx on public.food_entries(user_id, entry_date, meal, created_at);
alter table public.food_entries enable row level security;
grant select, insert, update, delete on public.food_entries to authenticated;

create policy "Users can view their own food entries" on public.food_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add their own food entries" on public.food_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own food entries" on public.food_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own food entries" on public.food_entries for delete to authenticated using ((select auth.uid()) = user_id);
