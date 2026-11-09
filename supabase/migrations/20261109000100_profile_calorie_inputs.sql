-- Existing profile rows remain nullable until their owners complete onboarding again.
alter table public.profiles
  add column if not exists age_years smallint check (age_years between 18 and 100),
  add column if not exists sex text check (sex in ('female', 'male')),
  add column if not exists activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active'));

-- Gain and maintenance targets must not be forced up to the weight-loss floor.
alter table public.profiles
  drop constraint if exists profiles_daily_calorie_target_check;

alter table public.profiles
  add constraint profiles_daily_calorie_target_check
  check (daily_calorie_target between 1 and 20000);
