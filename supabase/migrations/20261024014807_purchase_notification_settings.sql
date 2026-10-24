-- Public display preferences only. Only authenticated store admins may change them.
create table if not exists public.purchase_notification_settings (
  id text primary key default 'main' check (id = 'main'),
  enabled boolean not null default true,
  title text not null default 'Compra realizada!' check (char_length(trim(title)) between 1 and 80),
  messages jsonb not null default '[{"text":"Um cliente comprou filamentos na 3DFLEX.","enabled":true}]'::jsonb
    check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) between 1 and 6),
  display_seconds integer not null default 6 check (display_seconds between 3 and 20),
  interval_seconds integer not null default 60 check (interval_seconds between 15 and 300 and interval_seconds >= display_seconds + 5),
  updated_at timestamptz not null default now()
);
alter table public.purchase_notification_settings enable row level security;
revoke all on public.purchase_notification_settings from anon, authenticated;
grant select on public.purchase_notification_settings to anon, authenticated;
grant insert, update on public.purchase_notification_settings to authenticated;

create policy "Public can read purchase notification preferences"
  on public.purchase_notification_settings for select to anon, authenticated using (true);
create policy "Admins can insert purchase notification preferences"
  on public.purchase_notification_settings for insert to authenticated
  with check (public.has_role(_role => 'admin'::public.app_role, _user_id => (select auth.uid())));
create policy "Admins can update purchase notification preferences"
  on public.purchase_notification_settings for update to authenticated
  using (public.has_role(_role => 'admin'::public.app_role, _user_id => (select auth.uid())))
  with check (public.has_role(_role => 'admin'::public.app_role, _user_id => (select auth.uid())));
insert into public.purchase_notification_settings (id) values ('main') on conflict (id) do nothing;
