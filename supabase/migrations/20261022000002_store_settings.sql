create table if not exists public.store_settings (
 id text primary key default 'main' check (id = 'main'),
 business_name text not null default '3DFLEX',
 legal_name text not null default '',
 cnpj text not null default '',
 whatsapp text not null default '',
 phone text not null default '',
 email text not null default '',
 address text not null default '',
 about text not null default '',
 logo_url text not null default '',
 banner_url text not null default '',
 updated_at timestamptz not null default now()
);
alter table public.store_settings enable row level security;
create policy "Public can read store contact details" on public.store_settings for select to anon, authenticated using (true);
create policy "Admins can create store settings" on public.store_settings for insert to authenticated with check (public.has_role('admin', auth.uid()));
create policy "Admins can update store settings" on public.store_settings for update to authenticated using (public.has_role('admin', auth.uid())) with check (public.has_role('admin', auth.uid()));
insert into public.store_settings(id) values ('main') on conflict (id) do nothing;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('store-assets','store-assets',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "Public can view store assets" on storage.objects for select to anon, authenticated using (bucket_id = 'store-assets');
create policy "Admins can upload store assets" on storage.objects for insert to authenticated with check (bucket_id = 'store-assets' and public.has_role('admin', auth.uid()));
create policy "Admins can update store assets" on storage.objects for update to authenticated using (bucket_id = 'store-assets' and public.has_role('admin', auth.uid())) with check (bucket_id = 'store-assets' and public.has_role('admin', auth.uid()));
