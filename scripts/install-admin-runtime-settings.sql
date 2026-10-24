-- 3DFLEX only. Preserve the active Blackcat integration: no secret/environment changes.
-- The existing charge handler is controlled by server secrets, independently of this preferences table.
begin;
create table if not exists public.payment_gateway_settings (
 id text primary key default 'main' check(id='main'),
 provider text not null default 'none' check(provider in ('none','blackcat','mercadopago','asaas','custom')),
 environment text not null default 'sandbox' check(environment in ('sandbox','production')),
 pix_enabled boolean not null default false,updated_at timestamptz not null default now()
);
revoke all on public.payment_gateway_settings from public,anon,authenticated;
grant select,insert,update on public.payment_gateway_settings to authenticated;
grant all on public.payment_gateway_settings to service_role;
alter table public.payment_gateway_settings enable row level security;
drop policy if exists "Admins can view gateway preferences" on public.payment_gateway_settings;
create policy "Admins can view gateway preferences" on public.payment_gateway_settings for select to authenticated using(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role));
drop policy if exists "Admins can insert gateway preferences" on public.payment_gateway_settings;
create policy "Admins can insert gateway preferences" on public.payment_gateway_settings for insert to authenticated with check(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role));
drop policy if exists "Admins can update gateway preferences" on public.payment_gateway_settings;
create policy "Admins can update gateway preferences" on public.payment_gateway_settings for update to authenticated using(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role)) with check(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role));
-- This store already uses Blackcat in production. Seed preferences only when no row exists.
insert into public.payment_gateway_settings(id,provider,environment,pix_enabled) values('main','blackcat','production',true) on conflict(id) do nothing;

create table if not exists public.purchase_notification_settings (
 id text primary key default 'main' check(id='main'),enabled boolean not null default true,
 title text not null default 'Compra realizada!' check(char_length(trim(title)) between 1 and 80),
 messages jsonb not null default '[{"text":"Um cliente comprou filamentos na 3DFLEX.","enabled":true}]'::jsonb check(jsonb_typeof(messages)='array' and jsonb_array_length(messages) between 1 and 6),
 display_seconds integer not null default 6 check(display_seconds between 3 and 20),
 interval_seconds integer not null default 60 check(interval_seconds between 15 and 300 and interval_seconds>=display_seconds+5),
 updated_at timestamptz not null default now()
);
revoke all on public.purchase_notification_settings from public,anon,authenticated;
grant select on public.purchase_notification_settings to anon,authenticated;
grant insert,update on public.purchase_notification_settings to authenticated;
grant all on public.purchase_notification_settings to service_role;
alter table public.purchase_notification_settings enable row level security;
drop policy if exists "Public can read purchase notification preferences" on public.purchase_notification_settings;
create policy "Public can read purchase notification preferences" on public.purchase_notification_settings for select to anon,authenticated using(true);
drop policy if exists "Admins can insert purchase notification preferences" on public.purchase_notification_settings;
create policy "Admins can insert purchase notification preferences" on public.purchase_notification_settings for insert to authenticated with check(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role));
drop policy if exists "Admins can update purchase notification preferences" on public.purchase_notification_settings;
create policy "Admins can update purchase notification preferences" on public.purchase_notification_settings for update to authenticated using(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role)) with check(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role));
insert into public.purchase_notification_settings(id) values('main') on conflict(id) do nothing;
notify pgrst,'reload schema';
commit;
