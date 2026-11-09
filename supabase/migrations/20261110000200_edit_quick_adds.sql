grant update on public.quick_adds to authenticated;

drop policy if exists "Users can update their own quick adds" on public.quick_adds;
create policy "Users can update their own quick adds"
  on public.quick_adds for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
