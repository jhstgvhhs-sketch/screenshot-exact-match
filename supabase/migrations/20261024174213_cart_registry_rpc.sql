begin;
-- Capability-based write-only endpoint. Only token hashes are persisted.
create or replace function public.registry_sync_cart(p_token text,p_items jsonb,p_contact jsonb default null,p_consents jsonb default null,p_source text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare h text; safe_items jsonb; contact jsonb; consents jsonb:='{}'; channel text; recipient text; phone text; email text; cart uuid; parent uuid;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Sessão inválida'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>30 then raise exception 'Carrinho inválido'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) i where coalesce(i->>'quantity','') !~ '^(10|[1-9])$' or coalesce(i->>'variant_id','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$') then raise exception 'Itens inválidos'; end if;
 if (select count(*) from jsonb_array_elements(p_items)) <> (select count(distinct i->>'variant_id') from jsonb_array_elements(p_items) i) then raise exception 'Não repita a mesma cor'; end if;
 h:=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not public.recovery_rate_allow('registry:global',1200) or not public.recovery_rate_allow('registry:'||h,60) then raise exception 'Muitas solicitações. Tente novamente em um minuto.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('variant_id',v.id,'quantity',(i->>'quantity')::integer,'name',p.name,'color',v.color,'price',p.price) order by v.id),'[]') into safe_items
 from jsonb_array_elements(p_items) i join public.product_variants v on v.id=(i->>'variant_id')::uuid join public.products p on p.id=v.product_id where p.active;
 if p_contact is not null then
  if jsonb_typeof(p_contact)<>'object' then raise exception 'Contato inválido'; end if;
  email:=lower(left(btrim(coalesce(p_contact->>'email','')),160));
  if email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then email:=''; end if;
  phone:=regexp_replace(coalesce(p_contact->>'phone',''),'[^0-9]','','g');
  if length(phone) in (10,11) then phone:='55'||phone; end if;
  if phone !~ '^55[1-9][0-9]{9,10}$' then phone:=''; end if;
  contact:=jsonb_build_object('name',left(btrim(coalesce(p_contact->>'name','')),120),'email',email,'phone',phone);
 end if;
 if p_consents is not null then
  if jsonb_typeof(p_consents)<>'object' then raise exception 'Consentimento inválido'; end if;
  foreach channel in array array['email','whatsapp'] loop
   if p_consents ? channel then
    if jsonb_typeof(p_consents->channel)<>'boolean' then raise exception 'Consentimento inválido'; end if;
    recipient:=case when channel='email' then contact->>'email' else contact->>'phone' end;
    if coalesce(recipient,'')='' then raise exception 'Informe um contato válido antes de autorizar este canal'; end if;
    consents:=consents||jsonb_build_object(channel,jsonb_build_object('granted',p_consents->channel,'contact_hash',encode(sha256(convert_to(recipient,'UTF8')),'hex')));
   end if;
  end loop;
 end if;
 if p_source ~ '^[a-f0-9]{64}$' then
  select cart_id into parent from public.recovery_links where token_hash=encode(sha256(convert_to(p_source,'UTF8')),'hex') and kind='recover' and expires_at>now();
 end if;
 cart:=public.recovery_sync(h,auth.uid(),safe_items,contact,consents,parent);
 return jsonb_build_object('cartId',cart);
end $$;
revoke all on function public.registry_sync_cart(text,jsonb,jsonb,jsonb,text) from public;
grant execute on function public.registry_sync_cart(text,jsonb,jsonb,jsonb,text) to anon,authenticated;

-- Read/admin only. Abandonment is derived from the server clock, not a browser timer.
create or replace function public.admin_cart_registry(p_page integer default 0,p_status text default 'all')
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.has_role(_user_id=>auth.uid(),_role=>'admin'::public.app_role) then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 if p_page<0 or p_page>100000 or p_status not in ('all','active','abandoned','recovering','recovered','expired','pending_payment','completed') then raise exception 'Filtro inválido'; end if;
 perform public.recovery_reconcile();
 with base as (
  select c.id,c.customer_name,c.email,c.phone,c.items,c.estimated_value,c.last_activity_at,c.expires_at,c.email_consent,c.whatsapp_consent,c.linked_order_id,
   case when o.payment_status in ('paid','pago') and o.status not in ('cancelado','cancelled') then 'recovered'
    when o.status in ('delivered','entregue','concluido','completed') then 'completed'
    when o.payment_status in ('pending','pendente') and o.status not in ('cancelado','cancelled') then 'pending_payment'
    when c.status='expired' or c.expires_at<=now() then 'expired'
    when c.status='recovering' then 'recovering'
    when c.last_activity_at<=now()-interval '30 minutes' then 'abandoned' else 'active' end status,
   case when o.payment_status in ('paid','pago') and o.status not in ('cancelado','cancelled') then o.total else 0 end confirmed_value
  from public.recovery_carts c left join public.orders o on o.id=coalesce(c.recovered_order_id,c.linked_order_id)
  where c.parent_id is null and jsonb_array_length(c.items)>0
 ), filtered as (select * from base where p_status='all' or status=p_status), page as (
  select * from filtered order by last_activity_at desc,id limit 25 offset p_page*25
 ) select jsonb_build_object('carts',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'), 'count',(select count(*) from filtered),
  'metrics',jsonb_build_object('abandoned',(select count(*) from base where status='abandoned'),
   'potential',(select coalesce(sum(estimated_value),0) from base where status='abandoned'),
   'recovered',(select count(*) from base where status='recovered'),
   'revenue',(select coalesce(sum(confirmed_value),0) from base where status='recovered'))) into result;
 return result;
end $$;
revoke all on function public.admin_cart_registry(integer,text) from public,anon;
grant execute on function public.admin_cart_registry(integer,text) to authenticated;
notify pgrst,'reload schema';
commit;
