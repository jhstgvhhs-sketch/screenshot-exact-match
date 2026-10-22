alter table public.product_reviews add column if not exists source text not null default 'customer' check (source in ('customer','admin'));
create policy "Admins can insert submitted customer feedback" on public.product_reviews for insert to authenticated with check (public.has_role('admin', auth.uid()) and source = 'admin');
