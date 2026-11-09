create table if not exists public.user_gemini_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  encrypted_key text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_gemini_keys enable row level security;
revoke all on table public.user_gemini_keys from public, anon, authenticated;

create or replace function public.set_my_gemini_key(p_encrypted_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_encrypted_key is null or char_length(p_encrypted_key) > 4096 then
    raise exception 'Invalid encrypted key';
  end if;

  insert into public.user_gemini_keys (user_id, encrypted_key, updated_at)
  values (current_user_id, p_encrypted_key, now())
  on conflict (user_id) do update
    set encrypted_key = excluded.encrypted_key, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.get_my_gemini_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encrypted_key
  from public.user_gemini_keys
  where user_id = auth.uid()
$$;

create or replace function public.has_my_gemini_key()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_gemini_keys where user_id = auth.uid()
  )
$$;

create or replace function public.delete_my_gemini_key()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  delete from public.user_gemini_keys where user_id = current_user_id;
end;
$$;

revoke all on function public.set_my_gemini_key(text) from public, anon, authenticated;
revoke all on function public.get_my_gemini_key() from public, anon, authenticated;
revoke all on function public.has_my_gemini_key() from public, anon, authenticated;
revoke all on function public.delete_my_gemini_key() from public, anon, authenticated;
grant execute on function public.set_my_gemini_key(text) to authenticated;
grant execute on function public.get_my_gemini_key() to authenticated;
grant execute on function public.has_my_gemini_key() to authenticated;
grant execute on function public.delete_my_gemini_key() to authenticated;

create or replace function public.clear_my_fitlog_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.weigh_ins where user_id = current_user_id;
  delete from public.exercise_logs where user_id = current_user_id;
  delete from public.food_entries where user_id = current_user_id;
  delete from public.food_memory where user_id = current_user_id;
  delete from public.quick_adds where user_id = current_user_id;
  delete from public.user_gemini_keys where user_id = current_user_id;
  delete from public.profiles where id = current_user_id;
end;
$$;

revoke all on function public.clear_my_fitlog_data() from public, anon, authenticated;
grant execute on function public.clear_my_fitlog_data() to authenticated;
