alter table public.profiles
  add column if not exists gemini_coach_enabled boolean not null default false;
