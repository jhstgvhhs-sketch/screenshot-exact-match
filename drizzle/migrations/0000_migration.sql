create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, phone text, cpf text, created_at timestamptz not null default now());
grant select, insert, update on public.profiles to authenticated; grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  insert into public.user_roles(user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text, sort int not null default 0);
create table public.products (id uuid primary key default gen_random_uuid(), category_id uuid references public.categories(id) on delete set null, name text not null, slug text not null unique, brand text, material text, weight text, diameter text, description text, price numeric(10,2) not null check (price >= 0), images text[] not null default '{}', featured boolean not null default false, active boolean not null default true, created_at timestamptz not null default now());
create table public.product_variants (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, color text not null, color_hex text, sku text not null unique, stock int not null default 0 check (stock >= 0), sort int not null default 0);
create table public.coupons (id uuid primary key default gen_random_uuid(), code text not null unique, percent_off numeric(5,2) check (percent_off > 0 and percent_off <= 100), amount_off numeric(10,2) check (amount_off > 0), active boolean not null default true, expires_at timestamptz, created_at timestamptz not null default now());
grant select on public.categories, public.products, public.product_variants to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants to authenticated;
grant select, insert, update, delete on public.coupons to authenticated;
grant all on public.categories, public.products, public.product_variants, public.coupons to service_role;
alter table public.categories enable row level security; alter table public.products enable row level security; alter table public.product_variants enable row level security; alter table public.coupons enable row level security;
create policy "public read" on public.categories for select using (true);
create policy "admin write" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "public read" on public.products for select using (active or public.has_role(auth.uid(),'admin'));
create policy "admin write" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "public read" on public.product_variants for select using (true);
create policy "admin write" on public.product_variants for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin all" on public.coupons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.addresses (id uuid primary key default gen_random_uuid(), user_id uuid not null, label text, cep text not null, street text not null, number text not null, complement text, district text not null, city text not null, state text not null, created_at timestamptz not null default now());
grant select, insert, update, delete on public.addresses to authenticated; grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "own addresses" on public.addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.orders (id uuid primary key default gen_random_uuid(), user_id uuid not null, status text not null default 'aguardando_pagamento', payment_status text not null default 'pendente', payment_method text, customer_name text not null, customer_email text not null, customer_phone text not null, customer_cpf text, ship_cep text not null, ship_street text not null, ship_number text not null, ship_complement text, ship_district text not null, ship_city text not null, ship_state text not null, subtotal numeric(10,2) not null, discount numeric(10,2) not null default 0, shipping numeric(10,2) not null, total numeric(10,2) not null, coupon_code text, tracking_code text, created_at timestamptz not null default now());
create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, product_id uuid, variant_id uuid, product_name text not null, color text not null, sku text not null, unit_price numeric(10,2) not null, quantity int not null check (quantity > 0));
grant select, update on public.orders to authenticated; grant select on public.order_items to authenticated;
grant all on public.orders, public.order_items to service_role;
alter table public.orders enable row level security; alter table public.order_items enable row level security;
create policy "own or admin read" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin update" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "own or admin read" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.has_role(auth.uid(),'admin'))));

-- Server-side order creation: prices, stock, coupon and shipping computed in DB
create or replace function public.place_order(_items jsonb, _customer jsonb, _coupon text, _method text) returns uuid language plpgsql security definer set search_path=public as $$
declare _uid uuid := auth.uid(); _order uuid; _sub numeric := 0; _disc numeric := 0; _ship numeric := 37.80; it jsonb; v record; c record; q int;
begin
  if _uid is null then raise exception 'Faça login para finalizar a compra'; end if;
  if _method not in ('pix','cartao') then raise exception 'Forma de pagamento inválida'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'Carrinho vazio'; end if;
  insert into orders(user_id, payment_method, customer_name, customer_email, customer_phone, customer_cpf, ship_cep, ship_street, ship_number, ship_complement, ship_district, ship_city, ship_state, subtotal, shipping, total)
  values (_uid, _method, _customer->>'name', _customer->>'email', _customer->>'phone', nullif(_customer->>'cpf',''), _customer->>'cep', _customer->>'street', _customer->>'number', nullif(_customer->>'complement',''), _customer->>'district', _customer->>'city', _customer->>'state', 0, _ship, 0) returning id into _order;
  for it in select * from jsonb_array_elements(_items) loop
    q := (it->>'quantity')::int;
    if q is null or q < 1 or q > 99 then raise exception 'Quantidade inválida'; end if;
    select pv.id, pv.color, pv.sku, pv.stock, p.id pid, p.name, p.price into v from product_variants pv join products p on p.id=pv.product_id where pv.id=(it->>'variant_id')::uuid and p.active for update of pv;
    if not found then raise exception 'Produto indisponível'; end if;
    if v.stock < q then raise exception 'Estoque insuficiente para % (%)', v.name, v.color; end if;
    update product_variants set stock = stock - q where id = v.id;
    insert into order_items(order_id, product_id, variant_id, product_name, color, sku, unit_price, quantity) values (_order, v.pid, v.id, v.name, v.color, v.sku, v.price, q);
    _sub := _sub + v.price * q;
  end loop;
  if coalesce(_coupon,'') <> '' then
    select * into c from coupons where upper(code)=upper(_coupon) and active and (expires_at is null or expires_at > now());
    if not found then raise exception 'Cupom inválido'; end if;
    _disc := least(_sub, coalesce(round(_sub * c.percent_off / 100, 2), c.amount_off, 0));
  end if;
  update orders set subtotal=_sub, discount=_disc, total=_sub-_disc+_ship, coupon_code=nullif(upper(_coupon),'') where id=_order;
  return _order;
end $$;
revoke all on function public.place_order(jsonb,jsonb,text,text) from public, anon;
grant execute on function public.place_order(jsonb,jsonb,text,text) to authenticated;

create or replace function public.check_coupon(_code text) returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('code', code, 'percent_off', percent_off, 'amount_off', amount_off) from coupons where upper(code)=upper(_code) and active and (expires_at is null or expires_at > now()) $$;
grant execute on function public.check_coupon(text) to anon, authenticated;

insert into public.categories(name, slug, description, sort) values
 ('PLA','pla','Filamentos PLA de fácil impressão',1),('PETG','petg','Filamentos PETG resistentes',2),('Acessórios','acessorios','Sílica, embalagens a vácuo e mais',3);
insert into public.products(category_id, name, slug, brand, material, weight, diameter, description, price, featured)
select id, 'Filamento PLA MasterPrint 1 kg — 1,75 mm', 'pla-masterprint-1kg', 'MasterPrint', 'PLA', '1 kg', '1,75 mm', 'Filamento PLA MasterPrint em carretel de 1 kg com diâmetro de 1,75 mm. Disponível em diversas cores.', 59.90, true from public.categories where slug='pla';
insert into public.product_variants(product_id, color, color_hex, sku, sort)
select p.id, v.color, v.hex, 'MP-PLA-1KG-' || v.code, v.ord from public.products p, (values
 ('Branco','#F5F5F5','BRA',1),('Preto','#111111','PRE',2),('Cinza','#8A8A8A','CIN',3),('Marrom','#6B4226','MAR',4),('Prata','#C0C0C0','PRA',5),('Dourado','#D4AF37','DOU',6),('Vermelho','#D62828','VER',7),('Amarelo','#F6C90E','AMA',8),('Laranja','#FF6A00','LAR',9),('Roxo','#6A1B9A','ROX',10),('Rosa','#F48FB1','ROS',11),('Verde','#2E7D32','VRD',12),('Azul','#1E5BB8','AZU',13),('Rainbow Silk','linear-gradient(90deg,#ff3b3b,#ffb000,#3bd16f,#2f80ed,#b44cff)','RSK',14)
) as v(color,hex,code,ord) where p.slug='pla-masterprint-1kg';