-- Execute no banco Lovable Cloud da loja 3DFLEX, não em projetos externos.
create table if not exists public.product_reviews (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 author_name text not null check (char_length(author_name) between 2 and 80),
 rating integer not null check (rating between 1 and 5),
 comment text not null check (char_length(comment) between 10 and 1500),
 approved boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists product_reviews_product_approved_idx on public.product_reviews(product_id, approved, created_at desc);
alter table public.product_reviews enable row level security;
create policy "Anyone can read approved reviews" on public.product_reviews for select to anon, authenticated using (approved = true or public.has_role(auth.uid(), 'admin'));
create policy "Authenticated customers can submit pending reviews" on public.product_reviews for insert to authenticated with check (approved = false);
create policy "Admins can moderate reviews" on public.product_reviews for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete reviews" on public.product_reviews for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
