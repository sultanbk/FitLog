alter table public.profiles
  add column if not exists gemini_food_parsing_enabled boolean not null default false;
