begin;
create table if not exists public.product_reviews (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 author_name text not null check(char_length(author_name) between 2 and 80),
 rating integer not null check(rating between 1 and 5),
 comment text not null check(char_length(comment) between 10 and 1500),
 approved boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.product_reviews add column if not exists source text not null default 'customer' check(source in ('customer','admin'));
create index if not exists product_reviews_product_approved_idx on public.product_reviews(product_id,approved,created_at desc);
create index if not exists product_reviews_storefront_idx on public.product_reviews(created_at desc,id) where approved;
alter table public.product_reviews enable row level security;
grant select on public.product_reviews to anon,authenticated;
grant insert,update,delete on public.product_reviews to authenticated;
-- Replaces only the known review policies, correcting has_role argument order.
drop policy if exists "Anyone can read approved reviews" on public.product_reviews;
create policy "Anyone can read approved reviews" on public.product_reviews for select to anon,authenticated
 using(approved or public.has_role(_user_id=>(select auth.uid()),_role=>'admin'::public.app_role));
drop policy if exists "Authenticated customers can submit pending reviews" on public.product_reviews;
create policy "Authenticated customers can submit pending reviews" on public.product_reviews for insert to authenticated
 with check(not approved and source='customer');
drop policy if exists "Admins can moderate reviews" on public.product_reviews;
create policy "Admins can moderate reviews" on public.product_reviews for update to authenticated
 using(public.has_role(_user_id=>(select auth.uid()),_role=>'admin'::public.app_role))
 with check(public.has_role(_user_id=>(select auth.uid()),_role=>'admin'::public.app_role));
drop policy if exists "Admins can delete reviews" on public.product_reviews;
create policy "Admins can delete reviews" on public.product_reviews for delete to authenticated
 using(public.has_role(_user_id=>(select auth.uid()),_role=>'admin'::public.app_role));
drop policy if exists "Admins can insert submitted customer feedback" on public.product_reviews;
create policy "Admins can insert submitted customer feedback" on public.product_reviews for insert to authenticated
 with check(source='admin' and public.has_role(_user_id=>(select auth.uid()),_role=>'admin'::public.app_role));
notify pgrst,'reload schema';
commit;
