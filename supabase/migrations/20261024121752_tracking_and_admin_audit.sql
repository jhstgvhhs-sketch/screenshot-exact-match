-- Requires 20261024114941_admin_management_dashboard.sql. Additive; no historical backfill.
alter table public.orders add column if not exists tracking_carrier text;
alter table public.orders add column if not exists tracking_url text;
create or replace function public.valid_tracking_url(p_url text) returns boolean
language sql immutable security invoker set search_path=public as $$
 select p_url is null or (length(p_url)<=2048 and p_url ~ '^https://([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}(:443)?([/?#][^[:space:]]*)?$'
 and strpos(p_url,'@')=0 and strpos(p_url,chr(92))=0);
$$;
revoke all on function public.valid_tracking_url(text) from public,anon;
grant execute on function public.valid_tracking_url(text) to authenticated,service_role;
alter table public.orders add constraint orders_tracking_url_valid check(public.valid_tracking_url(tracking_url));
alter table public.orders add constraint orders_tracking_carrier_length check(tracking_carrier is null or length(tracking_carrier)<=120);

create or replace function public.admin_save_tracking(p_order uuid,p_carrier text,p_code text,p_url text) returns boolean
language plpgsql security invoker set search_path=public as $$
begin
 if auth.uid() is null or not public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role) then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 if length(coalesce(p_carrier,''))>120 or length(coalesce(p_code,''))>120 or not public.valid_tracking_url(nullif(trim(p_url),'')) then raise exception 'Confira transportadora, código e URL HTTPS de rastreamento'; end if;
 update public.orders set tracking_carrier=nullif(trim(p_carrier),''),tracking_code=nullif(trim(p_code),''),tracking_url=nullif(trim(p_url),'') where id=p_order;
 return found;
end $$;
revoke all on function public.admin_save_tracking(uuid,text,text,text) from public,anon;
grant execute on function public.admin_save_tracking(uuid,text,text,text) to authenticated;

create table public.admin_preferences (
 id text primary key check(id='main'),low_stock_limit integer not null default 3 check(low_stock_limit between 0 and 9999)
);
revoke all on public.admin_preferences from public,anon,authenticated;
grant select,update on public.admin_preferences to authenticated;
grant all on public.admin_preferences to service_role;
alter table public.admin_preferences enable row level security;
create policy admin_preferences_read on public.admin_preferences for select to authenticated using(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role));
create policy admin_preferences_update on public.admin_preferences for update to authenticated using(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role)) with check(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role));
insert into public.admin_preferences(id) values('main');

create table public.tracking_email_notifications (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 state text not null check(state in ('processing','accepted','delivered','failed','uncertain','bounced','complained')),
 attempts integer not null default 1,provider_id text unique,result_code text not null,http_status integer,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(order_id,fingerprint)
);
revoke all on public.tracking_email_notifications from public,anon,authenticated;
grant select on public.tracking_email_notifications to authenticated;
grant all on public.tracking_email_notifications to service_role;
alter table public.tracking_email_notifications enable row level security;
create policy tracking_email_admin_read on public.tracking_email_notifications for select to authenticated using(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role));
create index tracking_email_order_idx on public.tracking_email_notifications(order_id,created_at desc);
create table public.tracking_email_attempts (
 id bigint generated always as identity primary key,order_id uuid not null references public.orders(id),notification_id uuid references public.tracking_email_notifications(id),
 actor_id uuid,event_id text unique,state text not null,result_code text not null,http_status integer,created_at timestamptz not null default now()
);
revoke all on public.tracking_email_attempts from public,anon,authenticated;
grant select on public.tracking_email_attempts to authenticated;
grant all on public.tracking_email_attempts to service_role;
revoke all on sequence public.tracking_email_attempts_id_seq from public,anon,authenticated;
grant usage,select on sequence public.tracking_email_attempts_id_seq to service_role;
alter table public.tracking_email_attempts enable row level security;
create policy tracking_email_attempt_admin_read on public.tracking_email_attempts for select to authenticated using(public.has_role(_user_id:=auth.uid(),_role:='admin'::public.app_role));
create index tracking_email_attempt_order_idx on public.tracking_email_attempts(order_id,created_at desc);

-- Atomic claim; only an explicit retry of a known rejection is eligible. No retry after uncertainty/acceptance.
create or replace function public.tracking_email_claim(p_order uuid,p_fingerprint text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare row public.tracking_email_notifications%rowtype;
begin
 insert into public.tracking_email_notifications as n(order_id,fingerprint,state,result_code)
 values(p_order,p_fingerprint,'processing','processing')
 on conflict(order_id,fingerprint) do update set state='processing',result_code='processing',attempts=n.attempts+1,updated_at=now()
 where n.state='failed' and n.attempts<3 and n.updated_at<now()-interval '1 minute' returning * into row;
 if found then return jsonb_build_object('claimed',true,'notification',to_jsonb(row)); end if;
 select * into row from public.tracking_email_notifications where order_id=p_order and fingerprint=p_fingerprint;
 return jsonb_build_object('claimed',false,'notification',to_jsonb(row));
end $$;
revoke all on function public.tracking_email_claim(uuid,text) from public,anon,authenticated;
grant execute on function public.tracking_email_claim(uuid,text) to service_role;

-- Allocate integer cents deterministically; all rankings reconcile exactly.
create or replace function public.admin_financial_report(p_start date,p_end date) returns jsonb
language plpgsql stable security invoker set search_path=public as $$
declare a timestamptz; b timestamptz; today date; result jsonb;
begin
 if auth.uid() is null or not public.has_role(_user_id := auth.uid(), _role := 'admin'::public.app_role) then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 if p_start is null or p_end is null or p_end<p_start or p_end-p_start>366 then raise exception 'Selecione até 367 dias válidos'; end if;
 a:=p_start::timestamp at time zone 'America/Sao_Paulo'; b:=(p_end+1)::timestamp at time zone 'America/Sao_Paulo';
 today:=(now() at time zone 'America/Sao_Paulo')::date;
 with eligible as materialized (
  select id,paid_at,total,shipping,discount,payment_method,payment_status,status from public.orders where payment_status in ('paid','pago') and status not in ('cancelled','cancelado')
 ), paid as materialized (select * from eligible where paid_at>=a and paid_at<b),
 placed as materialized (select created_at,payment_status,status,payment_method,total from public.orders where created_at>=a and created_at<b),
 lines as (
  select i.*,o.total,o.shipping,o.discount,
   sum(i.unit_price*i.quantity) over(partition by o.id) gross_total,
   p.images[1] image
  from paid o join public.order_items i on i.order_id=o.id left join public.products p on p.id=i.product_id
 ), cents as (
  select *,case when gross_total>0 then round((total-shipping)*100)*(unit_price*quantity)/gross_total else 0 end exact_cents from lines
 ), remainders as (
  select *,floor(exact_cents) base_cents,
   round((total-shipping)*100)-sum(floor(exact_cents)) over(partition by order_id) remaining_cents,
   row_number() over(partition by order_id order by (exact_cents-floor(exact_cents)) desc,id) allocation_rank
  from cents
 ), allocated as (
  select *,(base_cents+case when allocation_rank<=remaining_cents then 1 else 0 end)/100 net from remainders
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
  'ticket',(select coalesce(round(sum(total)/nullif(count(*),0),2),0) from paid),
  'pending',(select count(*) from placed where payment_status in ('pending','pendente') and status not in ('cancelled','cancelado')),
  'pendingValue',(select coalesce(sum(total),0) from placed where payment_status in ('pending','pendente') and status not in ('cancelled','cancelado')),
  'total',(select count(*) from placed),
  'undatedPaid',(select count(*) from eligible where paid_at is null),
  'undatedValue',(select coalesce(sum(total),0) from eligible where paid_at is null),
  'unitemizedPaid',(select count(*) from paid o where not exists(select 1 from public.order_items i where i.order_id=o.id)),
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


-- Public registration must never assign an administrative role, even if none exist.
-- Existing profiles and roles are preserved. Future administrators are authorized by the backend owner.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,full_name) values(new.id,new.raw_user_meta_data->>'full_name');
 insert into public.user_roles(user_id,role) values(new.id,'user');
 return new;
end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

-- Refresh PostgREST after adding/replacing the administrative RPCs.
notify pgrst, 'reload schema';
