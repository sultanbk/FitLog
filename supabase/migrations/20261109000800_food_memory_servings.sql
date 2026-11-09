alter table public.food_memory
  add column if not exists canonical_serving text;

update public.food_memory
set canonical_serving = lower(regexp_replace(trim(serving_description), '\s+', ' ', 'g'))
where canonical_serving is null;

alter table public.food_memory
  alter column canonical_serving set not null;

alter table public.food_memory
  drop constraint if exists food_memory_user_id_canonical_name_key;

alter table public.food_memory
  add constraint food_memory_user_canonical_serving_key
  unique (user_id, canonical_name, canonical_serving);
