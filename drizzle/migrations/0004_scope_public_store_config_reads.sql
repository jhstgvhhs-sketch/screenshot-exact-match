drop policy "Public can read shipping settings" on public.shipping_settings;
create policy "Public can read store shipping config" on public.shipping_settings for select to anon, authenticated
using (id = 'main' or public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy "Public can read store contact details" on public.store_settings;
create policy "Public can read store contact config" on public.store_settings for select to anon, authenticated
using (id = 'main' or public.has_role(auth.uid(), 'admin'::public.app_role));