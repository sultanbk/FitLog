create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  exercise text not null default 'push-ups' check (exercise = 'push-ups'),
  repetitions integer not null check (repetitions between 1 and 10000),
  created_at timestamptz not null default now()
);

create index if not exists exercise_logs_user_date_created_at_idx
  on public.exercise_logs (user_id, entry_date, created_at desc);

alter table public.exercise_logs enable row level security;
grant select, insert, delete on public.exercise_logs to authenticated;

drop policy if exists "Users can view their own exercise logs" on public.exercise_logs;
create policy "Users can view their own exercise logs"
  on public.exercise_logs for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own exercise logs" on public.exercise_logs;
create policy "Users can add their own exercise logs"
  on public.exercise_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own exercise logs" on public.exercise_logs;
create policy "Users can delete their own exercise logs"
  on public.exercise_logs for delete to authenticated
  using ((select auth.uid()) = user_id);
