create table if not exists public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric(6, 1) not null check (weight_kg between 25 and 350),
  created_at timestamptz not null default now()
);

create index if not exists weigh_ins_user_created_at_idx
  on public.weigh_ins (user_id, created_at desc);

alter table public.weigh_ins enable row level security;
grant select, insert on public.weigh_ins to authenticated;

drop policy if exists "Users can view their own weigh-ins" on public.weigh_ins;
create policy "Users can view their own weigh-ins"
  on public.weigh_ins for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own weigh-ins" on public.weigh_ins;
create policy "Users can add their own weigh-ins"
  on public.weigh_ins for insert to authenticated
  with check ((select auth.uid()) = user_id);
