drop policy "public read" on public.product_variants;
create policy "public read active product variants" on public.product_variants for select to public
using (exists (select 1 from public.products p where p.id = product_id and p.active) or public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy "Public can read purchase notification preferences" on public.purchase_notification_settings;
create policy "Public can read enabled purchase notifications" on public.purchase_notification_settings for select to anon, authenticated
using (enabled or public.has_role(auth.uid(), 'admin'::public.app_role));