-- Additive reporting only. Do not backfill confirmation dates from created_at.
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.order_items add column if not exists material_snapshot text;

create or replace function public.admin_capture_paid_at() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if TG_OP='INSERT' then
  new.paid_at := case when new.payment_status in ('paid','pago') then clock_timestamp() else null end;
 elsif old.payment_status not in ('paid','pago') and new.payment_status in ('paid','pago') then
  new.paid_at := coalesce(old.paid_at,clock_timestamp());
 else
  -- Even administrators cannot manufacture a historical confirmation via ordinary UPDATE.
  new.paid_at := old.paid_at;
 end if;
 return new;
end $$;
revoke all on function public.admin_capture_paid_at() from public,anon,authenticated;
create trigger admin_payment_timestamp before insert or update on public.orders
for each row execute function public.admin_capture_paid_at();

create or replace function public.admin_capture_material() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 select p.material into new.material_snapshot from public.products p where p.id=new.product_id;
 return new;
end $$;
revoke all on function public.admin_capture_material() from public,anon,authenticated;
create trigger admin_item_material before insert on public.order_items
for each row execute function public.admin_capture_material();

create index if not exists orders_admin_paid_at_idx on public.orders(paid_at) where payment_status in ('paid','pago');
create index if not exists orders_admin_created_at_idx on public.orders(created_at desc);
create index if not exists orders_admin_user_idx on public.orders(user_id);
create index if not exists order_items_admin_order_idx on public.order_items(order_id);

-- SECURITY INVOKER retains existing RLS, plus an explicit role check on every RPC.
create or replace function public.admin_financial_report(p_start date,p_end date) returns jsonb
language plpgsql stable security invoker set search_path=public as $$
declare a timestamptz; b timestamptz; today date; result jsonb;
begin
 if auth.uid() is null or not public.has_role(_user_id := auth.uid(), _role := 'admin'::public.app_role) then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 if p_start is null or p_end is null or p_end<p_start or p_end-p_start>366 then raise exception 'Selecione até 367 dias válidos'; end if;
 a:=p_start::timestamp at time zone 'America/Sao_Paulo'; b:=(p_end+1)::timestamp at time zone 'America/Sao_Paulo';
 today:=(now() at time zone 'America/Sao_Paulo')::date;
 with eligible as materialized (
  select * from public.orders where payment_status in ('paid','pago') and status not in ('cancelled','cancelado')
 ), paid as materialized (select * from eligible where paid_at>=a and paid_at<b),
 placed as materialized (select * from public.orders where created_at>=a and created_at<b),
 lines as (
  select i.*,o.total,o.shipping,o.discount,
   sum(i.unit_price*i.quantity) over(partition by o.id) gross_total,
   p.images[1] image
  from paid o join public.order_items i on i.order_id=o.id left join public.products p on p.id=i.product_id
 ), allocated as (
  select *,case when gross_total>0 then (total-shipping)*(unit_price*quantity)/gross_total else 0 end net from lines
 ), prod as (
  select product_id,min(product_name) product_name,min(image) image,sum(quantity) quantity,round(sum(net),2) revenue
  from allocated group by product_id,case when product_id is null then product_name end
 ), colors as (
  select color,coalesce(material_snapshot,'Material não registrado') material,sum(quantity) quantity,round(sum(net),2) revenue
  from allocated group by color,material_snapshot
 ), materials as (
  select coalesce(material_snapshot,'Material não registrado') material,sum(quantity) quantity,round(sum(net),2) revenue
  from allocated group by material_snapshot
 ), methods as (
  select case when payment_method in ('card','cartao') then 'Cartão' when payment_method='pix' then 'Pix' else 'Outro / não informado' end method,
   'Pago' state,count(*) quantity,sum(total) value from paid group by 1
  union all
  select case when payment_method in ('card','cartao') then 'Cartão' when payment_method='pix' then 'Pix' else 'Outro / não informado' end,
   'Pendente',count(*),sum(total) from placed where payment_status in ('pending','pendente') and status not in ('cancelled','cancelado') group by 1
 ), states as (
  select case when status in ('cancelled','cancelado') then 'Cancelados'
   when status in ('delivered','entregue') then 'Entregues' when status in ('shipped','enviado') then 'Enviados'
   when status in ('processing','processando','em_separacao','pagamento_confirmado') or (payment_status in ('paid','pago') and status in ('pending','aguardando_pagamento')) then 'Em preparação'
   when status in ('pending','aguardando_pagamento') then 'Aguardando pagamento' else status end label,count(*) quantity from placed group by 1
 )
 select jsonb_build_object(
  'today',(select coalesce(sum(total),0) from eligible where paid_at>=today::timestamp at time zone 'America/Sao_Paulo' and paid_at<(today+1)::timestamp at time zone 'America/Sao_Paulo'),
  'week',(select coalesce(sum(total),0) from eligible where paid_at>=(today-6)::timestamp at time zone 'America/Sao_Paulo' and paid_at<(today+1)::timestamp at time zone 'America/Sao_Paulo'),
  'month',(select coalesce(sum(total),0) from eligible where paid_at>=date_trunc('month',today)::timestamp at time zone 'America/Sao_Paulo' and paid_at<(today+1)::timestamp at time zone 'America/Sao_Paulo'),
  'revenue',(select coalesce(sum(total),0) from paid),'paid',(select count(*) from paid),
  'ticket',(select coalesce(sum(total)/nullif(count(*),0),0) from paid),
  'pending',(select count(*) from placed where payment_status in ('pending','pendente') and status not in ('cancelled','cancelado')),
  'pendingValue',(select coalesce(sum(total),0) from placed where payment_status in ('pending','pendente') and status not in ('cancelled','cancelado')),
  'total',(select count(*) from placed),
  'undatedPaid',(select count(*) from eligible where paid_at is null),
  'undatedValue',(select coalesce(sum(total),0) from eligible where paid_at is null),
  'series',(select coalesce(jsonb_agg(jsonb_build_object('date',d::date,'revenue',coalesce(v.value,0)) order by d),'[]') from generate_series(p_start::timestamp,p_end::timestamp,interval '1 day') d left join (select (paid_at at time zone 'America/Sao_Paulo')::date sale_date,sum(total) value from paid group by 1) v on v.sale_date=d::date),
  'products',(select coalesce(jsonb_agg(to_jsonb(t) order by quantity desc,product_name),'[]') from prod t),
  'colors',(select coalesce(jsonb_agg(to_jsonb(t) order by quantity desc,color),'[]') from colors t),
  'materials',(select coalesce(jsonb_agg(to_jsonb(t) order by quantity desc,material),'[]') from materials t),
  'methods',(select coalesce(jsonb_agg(to_jsonb(t) order by method,state),'[]') from methods t),
  'statuses',(select coalesce(jsonb_agg(to_jsonb(t) order by label),'[]') from states t)
 ) into result;
 return result;
end $$;
revoke all on function public.admin_financial_report(date,date) from public,anon;
grant execute on function public.admin_financial_report(date,date) to authenticated;

create or replace function public.admin_customer_page(p_search text default '',p_page integer default 0) returns jsonb
language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.has_role(_user_id := auth.uid(), _role := 'admin'::public.app_role) then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 if p_page<0 or p_page>100000 or length(p_search)>150 then raise exception 'Filtro inválido'; end if;
 with matches as materialized (
  select p.id,p.full_name,p.phone,p.created_at from public.profiles p
  where coalesce(p.full_name,'') ilike '%'||p_search||'%' or coalesce(p.phone,'') ilike '%'||p_search||'%'
 ), page as (select * from matches order by created_at desc,id limit 25 offset p_page*25),
 rows as (
  select p.*,count(o.id) orders,coalesce(sum(o.total) filter(where o.payment_status in ('paid','pago') and o.status not in ('cancelled','cancelado')),0) paid_total,
   (array_agg(o.customer_email order by o.created_at desc) filter(where o.customer_email<>''))[1] email
  from page p left join public.orders o on o.user_id=p.id group by p.id,p.full_name,p.phone,p.created_at
 ) select jsonb_build_object('count',(select count(*) from matches),'rows',coalesce(jsonb_agg(to_jsonb(rows) order by created_at desc,id),'[]')) into result from rows;
 return result;
end $$;
revoke all on function public.admin_customer_page(text,integer) from public,anon;
grant execute on function public.admin_customer_page(text,integer) to authenticated;

create or replace function public.admin_order_page(p_search text default '',p_filter text default 'all',p_page integer default 0,p_archived boolean default false,p_user uuid default null) returns jsonb
language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.has_role(_user_id := auth.uid(), _role := 'admin'::public.app_role) then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 if p_page<0 or p_page>100000 or length(p_search)>150 or p_filter not in ('all','paid','pending','processing','shipped','delivered','cancelled') then raise exception 'Filtro inválido'; end if;
 with matches as materialized (
  select id,user_id,customer_name,customer_email,created_at,total,status,payment_status,payment_method,tracking_code,archived_at from public.orders o
  where (p_archived or archived_at is null) and (p_user is null or user_id=p_user)
  and (p_search='' or starts_with(lower(id::text),lower(p_search)) or strpos(lower(customer_name),lower(p_search))>0 or strpos(lower(customer_email),lower(p_search))>0)
  and (p_filter='all'
   or (p_filter='paid' and payment_status in ('paid','pago') and status not in ('cancelled','cancelado'))
   or (p_filter='pending' and payment_status in ('pending','pendente') and status not in ('cancelled','cancelado'))
   or (p_filter='processing' and status in ('processing','processando','em_separacao','pagamento_confirmado'))
   or (p_filter='shipped' and status in ('shipped','enviado'))
   or (p_filter='delivered' and status in ('delivered','entregue'))
   or (p_filter='cancelled' and status in ('cancelled','cancelado')))
 ), page as (select * from matches order by created_at desc,id limit 25 offset p_page*25)
 select jsonb_build_object('count',(select count(*) from matches),'rows',coalesce(jsonb_agg(to_jsonb(page) order by created_at desc,id),'[]')) into result from page;
 return result;
end $$;
revoke all on function public.admin_order_page(text,text,integer,boolean,uuid) from public,anon;
grant execute on function public.admin_order_page(text,text,integer,boolean,uuid) to authenticated;
