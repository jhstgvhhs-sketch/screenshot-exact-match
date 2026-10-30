-- 3DFLEX base schema: reconstructed from the current application types and ordered migrations.
-- Fresh-project baseline. Does not import customer/order data.
begin;

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.app_role as enum ('admin','user');
exception when duplicate_object then null; end $$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort integer not null default 0
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  brand text,
  material text,
  weight text,
  diameter text,
  price numeric(12,2) not null check (price >= 0),
  images text[] not null default '{}',
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color text not null,
  color_hex text,
  sku text not null unique,
  stock integer not null default 0 check (stock >= 0),
  sort integer not null default 0,
  unique(product_id,color)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  cpf text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  unique(user_id,role)
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  district text not null,
  city text not null,
  state text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off numeric(7,2),
  amount_off numeric(12,2),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint coupons_discount_check check (
    (percent_off is not null and percent_off > 0 and percent_off <= 100 and amount_off is null)
    or (amount_off is not null and amount_off > 0 and percent_off is null)
  )
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_cpf text,
  ship_cep text not null,
  ship_street text not null,
  ship_number text not null,
  ship_complement text,
  ship_district text not null,
  ship_city text not null,
  ship_state text not null,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping numeric(12,2) not null default 37.80 check (shipping >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  coupon_code text,
  gift_items jsonb not null default '[]'::jsonb,
  payment_method text,
  payment_status text not null default 'pendente',
  status text not null default 'aguardando_pagamento',
  paid_at timestamptz,
  tracking_code text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  color text not null,
  sku text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  material_snapshot text,
  reserved_stock integer
);

create index if not exists products_active_idx on public.products(active,created_at desc);
create index if not exists product_variants_product_idx on public.product_variants(product_id,sort);
create index if not exists orders_user_created_idx on public.orders(user_id,created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists addresses_user_idx on public.addresses(user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role);
$$;
revoke all on function public.has_role(uuid,public.app_role) from public,anon;
grant execute on function public.has_role(uuid,public.app_role) to authenticated,service_role;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.profiles(id,full_name)
  values(new.id, nullif(new.raw_user_meta_data->>'full_name',''))
  on conflict(id) do nothing;
  insert into public.user_roles(user_id,role)
  values(new.id,'user') on conflict(user_id,role) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.check_coupon(_code text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare c public.coupons%rowtype;
begin
  select * into c from public.coupons
  where upper(code)=upper(trim(_code)) and active and (expires_at is null or expires_at>now());
  if not found then return jsonb_build_object('valid',false,'message','Cupom inválido ou expirado'); end if;
  return jsonb_build_object('valid',true,'code',c.code,'percent_off',c.percent_off,'amount_off',c.amount_off);
end $$;
grant execute on function public.check_coupon(text) to anon,authenticated;

create or replace function public.place_order(_items jsonb,_customer jsonb,_coupon text,_method text)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid(); v_order uuid; v_sub numeric:=0; v_disc numeric:=0;
  v_ship numeric:=37.80; it jsonb; v record; c public.coupons%rowtype;
  q integer; reserved integer;
begin
  if v_uid is null then raise exception 'Faça login para finalizar a compra'; end if;
  if _method not in ('pix','cartao') then raise exception 'Forma de pagamento inválida'; end if;
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) not between 1 and 30 then
    raise exception 'Carrinho inválido';
  end if;
  if exists(select 1 from jsonb_array_elements(_items) a where a->>'variant_id' is null or a->>'quantity' is null) then
    raise exception 'Itens inválidos';
  end if;
  if (select count(*) from jsonb_array_elements(_items)) <>
     (select count(distinct a->>'variant_id') from jsonb_array_elements(_items) a) then
    raise exception 'Não é permitido repetir a mesma cor';
  end if;
  if exists(select 1 from jsonb_array_elements(_items) a where (a->>'quantity') !~ '^(10|[1-9])$') then
    raise exception 'Permitido de 1 a 10 unidades por cor';
  end if;

  insert into public.orders(user_id,payment_method,customer_name,customer_email,customer_phone,customer_cpf,
    ship_cep,ship_street,ship_number,ship_complement,ship_district,ship_city,ship_state,subtotal,shipping,total)
  values(v_uid,_method,_customer->>'name',_customer->>'email',_customer->>'phone',nullif(_customer->>'cpf',''),
    _customer->>'cep',_customer->>'street',_customer->>'number',nullif(_customer->>'complement',''),
    _customer->>'district',_customer->>'city',_customer->>'state',0,v_ship,0)
  returning id into v_order;

  for it in select * from jsonb_array_elements(_items) loop
    q:=(it->>'quantity')::integer;
    select pv.id,pv.color,pv.sku,pv.stock,p.id as pid,p.name,p.price,p.material,p.category_id
      into v
    from public.product_variants pv join public.products p on p.id=pv.product_id
    where pv.id=(it->>'variant_id')::uuid and p.active
    for update of pv;
    if not found then raise exception 'Produto indisponível'; end if;
    reserved:=least(v.stock,q);
    update public.product_variants set stock=stock-reserved where id=v.id;
    insert into public.order_items(order_id,product_id,variant_id,product_name,color,sku,unit_price,quantity,material_snapshot,reserved_stock)
    values(v_order,v.pid,v.id,v.name,v.color,v.sku,v.price,q,v.material,reserved);
    v_sub:=v_sub+v.price*q;
  end loop;

  if coalesce(trim(_coupon),'')<>'' then
    select * into c from public.coupons where upper(code)=upper(trim(_coupon)) and active and (expires_at is null or expires_at>now());
    if not found then raise exception 'Cupom inválido'; end if;
    v_disc:=least(v_sub,coalesce(round(v_sub*c.percent_off/100,2),c.amount_off,0));
  end if;
  update public.orders set subtotal=v_sub,discount=v_disc,shipping=v_ship,total=v_sub-v_disc+v_ship,
    coupon_code=nullif(upper(trim(_coupon)),'') where id=v_order;
  return v_order;
end $$;
revoke all on function public.place_order(jsonb,jsonb,text,text) from public,anon;
grant execute on function public.place_order(jsonb,jsonb,text,text) to authenticated;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.addresses enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

grant select on public.categories,public.products,public.product_variants to anon,authenticated;
grant select,insert,update,delete on public.categories,public.products,public.product_variants to authenticated;
grant select,insert,update,delete on public.addresses to authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select,insert,update on public.orders,public.order_items to authenticated;
grant select on public.coupons to anon,authenticated;
grant all on public.categories,public.products,public.product_variants,public.profiles,public.user_roles,
  public.addresses,public.coupons,public.orders,public.order_items to service_role;

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories" on public.categories for select to anon,authenticated using (true);
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products" on public.products for select to anon,authenticated using (active or public.has_role(auth.uid(),'admin'));
drop policy if exists "Public can read variants of active products" on public.product_variants;
create policy "Public can read variants of active products" on public.product_variants for select to anon,authenticated
using (exists(select 1 from public.products p where p.id=product_id and (p.active or public.has_role(auth.uid(),'admin'))));
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
drop policy if exists "Admins manage variants" on public.product_variants;
create policy "Admins manage variants" on public.product_variants for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated using(id=auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists "Users read own roles" on public.user_roles;
create policy "Users read own roles" on public.user_roles for select to authenticated using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'));

drop policy if exists "Users manage own addresses" on public.addresses;
create policy "Users manage own addresses" on public.addresses for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists "Public can read active coupons" on public.coupons;
create policy "Public can read active coupons" on public.coupons for select to anon,authenticated using(active and (expires_at is null or expires_at>now()));
drop policy if exists "Admins manage coupons" on public.coupons;
create policy "Admins manage coupons" on public.coupons for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));

drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders for select to authenticated using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items" on public.order_items for select to authenticated
using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.has_role(auth.uid(),'admin'))));

insert into public.categories(name,slug,sort) values
 ('Filamentos','filamentos',1),('Impressoras','impressoras',2),('Acessórios','acessorios',3)
on conflict(slug) do nothing;

notify pgrst,'reload schema';
commit;
