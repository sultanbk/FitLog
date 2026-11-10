create table public.fitlog_coach_request_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  requested_at timestamptz not null
);

create index fitlog_coach_request_events_user_time_idx
  on public.fitlog_coach_request_events (user_id, requested_at);

alter table public.fitlog_coach_request_events enable row level security;
revoke all on table public.fitlog_coach_request_events from public, anon, authenticated;

create or replace function public.consume_my_fitlog_coach_request()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  request_time timestamptz;
  request_count integer;
  oldest_request timestamptz;
  retry_seconds integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );
  request_time := pg_catalog.clock_timestamp();

  delete from public.fitlog_coach_request_events
  where requested_at <= request_time - interval '1 hour';

  select count(*)::integer, min(requested_at)
    into request_count, oldest_request
    from public.fitlog_coach_request_events
    where user_id = current_user_id;

  if request_count >= 10 then
    retry_seconds := greatest(
      1,
      ceil(extract(epoch from (oldest_request + interval '1 hour' - request_time)))::integer
    );
    return pg_catalog.jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after_seconds', retry_seconds
    );
  end if;

  insert into public.fitlog_coach_request_events (user_id, requested_at)
  values (current_user_id, request_time);

  return pg_catalog.jsonb_build_object(
    'allowed', true,
    'remaining', 9 - request_count,
    'retry_after_seconds', 0
  );
end;
$$;

revoke all on function public.consume_my_fitlog_coach_request() from public, anon, authenticated;
grant execute on function public.consume_my_fitlog_coach_request() to authenticated;

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

  delete from public.fitlog_coach_request_events where user_id = current_user_id;
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
