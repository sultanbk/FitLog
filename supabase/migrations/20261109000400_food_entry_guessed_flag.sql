alter table public.food_entries
  add column if not exists is_guessed boolean not null default false;
