-- Run on the store's backend as database administrator.
-- Creates only the missing banner/logo bucket and missing policies.
-- Existing objects, bucket configuration and policies are preserved.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-assets', 'store-assets', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

do $repair$
begin
 if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='3dflex_admin_assets_select') then
  create policy "3dflex_admin_assets_select" on storage.objects for select to authenticated
   using (bucket_id='store-assets' and public.has_role(_user_id => (select auth.uid()), _role => 'admin'::public.app_role));
 end if;
 if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='3dflex_admin_assets_insert') then
  create policy "3dflex_admin_assets_insert" on storage.objects for insert to authenticated
   with check (bucket_id='store-assets' and public.has_role(_user_id => (select auth.uid()), _role => 'admin'::public.app_role));
 end if;
end
$repair$;
commit;

-- Verify configuration and administrator-only upload policy after installation.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id='store-assets';
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname='storage' and tablename='objects'
 and policyname in ('3dflex_admin_assets_select','3dflex_admin_assets_insert');
