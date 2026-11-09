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
  delete from public.profiles where id = current_user_id;
end;
$$;

revoke all on function public.clear_my_fitlog_data() from public, anon, authenticated;
grant execute on function public.clear_my_fitlog_data() to authenticated;
