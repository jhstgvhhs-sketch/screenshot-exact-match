drop policy "Public can read enabled purchase notifications" on public.purchase_notification_settings;
create policy "Public can read store purchase notification config" on public.purchase_notification_settings for select to anon, authenticated
using (id = 'main' or public.has_role(auth.uid(), 'admin'::public.app_role));