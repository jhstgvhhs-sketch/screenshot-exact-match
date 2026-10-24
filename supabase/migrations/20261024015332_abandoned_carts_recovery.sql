-- Isolated recovery subsystem. Does not change orders, prices, stock or payment functions.
create table public.recovery_settings (
 id boolean primary key default true check(id), config jsonb not null,
 updated_at timestamptz not null default now()
);
insert into public.recovery_settings(config) values ('{"enabled":false,"dry_run":true,"whatsapp_enabled":false,"email_enabled":false,"timezone":"America/Bahia","start_hour":9,"end_hour":20,"retention_days":30,"max_attempts":3,"suppress_pending_pix":true,"email_from":"","steps":[{"minutes":30,"subject":"Seu carrinho na 3DFLEX","text":"Olá, {nome}! 👋\n\nPercebemos que você deixou alguns produtos no carrinho da 3DFLEX.\n\nSeus filamentos estão a poucos passos de chegar até você!\n\n🛒 Continue sua compra por aqui:\n{link_recuperacao}\n\nSe precisar de ajuda, estamos à disposição.","wa_template":"","wa_language":"pt_BR"},{"minutes":1440,"subject":"Continue sua compra na 3DFLEX","text":"Olá, {nome}!\n\nPassando para lembrar que sua compra na 3DFLEX ainda não foi finalizada.\n\nVocê pode conferir seus produtos e concluir seu pedido pelo link:\n\n{link_recuperacao}\n\nQualquer dúvida sobre os filamentos, podemos ajudar!","wa_template":"","wa_language":"pt_BR"},{"minutes":4320,"subject":"Último lembrete do seu carrinho na 3DFLEX","text":"Olá, {nome}!\n\nEste é nosso último lembrete sobre os produtos que você selecionou na 3DFLEX.\n\nSe ainda tiver interesse, é só acessar:\n\n{link_recuperacao}\n\nSerá um prazer atender você!","wa_template":"","wa_language":"pt_BR"}]}'::jsonb);

create table public.recovery_carts (
 id uuid primary key default gen_random_uuid(), session_hash text not null unique,
 owner_id uuid references auth.users(id) on delete set null,
 parent_id uuid references public.recovery_carts(id) on delete set null,
 customer_name text not null default '', email text not null default '', phone text not null default '',
 email_consent boolean not null default false, whatsapp_consent boolean not null default false,
 items jsonb not null default '[]'::jsonb check(jsonb_typeof(items)='array'),
 estimated_value numeric(12,2) not null default 0,
 status text not null default 'active' check(status in ('active','abandoned','recovering','recovered','expired')),
 created_at timestamptz not null default now(), last_activity_at timestamptz not null default now(),
 abandoned_at timestamptz, expires_at timestamptz not null default now()+interval '7 days',
 linked_order_id uuid references public.orders(id) on delete set null,
 recovered_order_id uuid references public.orders(id) on delete set null,
 recovered_value numeric(12,2) not null default 0, recovered_at timestamptz,
 sequence_cancelled boolean not null default false
);
create index recovery_carts_owner on public.recovery_carts(owner_id,created_at desc);
create index recovery_carts_activity on public.recovery_carts(status,last_activity_at);
create table public.recovery_consents (
 id bigint generated always as identity primary key,
 cart_id uuid not null references public.recovery_carts(id) on delete cascade,
 channel text not null check(channel in ('email','whatsapp')), granted boolean not null,
 contact_hash text not null, purpose text not null default 'Recuperação do carrinho 3DFLEX',
 version text not null default 'recovery-v1', created_at timestamptz not null default now()
);
create table public.recovery_suppressions (
 channel text not null, contact_hash text not null, created_at timestamptz not null default now(),
 primary key(channel,contact_hash)
);
create table public.recovery_links (
 token_hash text primary key, cart_id uuid not null references public.recovery_carts(id) on delete cascade,
 kind text not null check(kind in ('recover','unsubscribe')), channel text, contact_hash text,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create table public.recovery_jobs (
 id uuid primary key default gen_random_uuid(), cart_id uuid not null references public.recovery_carts(id) on delete cascade,
 channel text not null check(channel in ('email','whatsapp')), step integer not null check(step between 0 and 2),
 dry_run boolean not null, due_at timestamptz not null, created_at timestamptz not null default now(),
 state text not null default 'queued' check(state in ('queued','claimed','accepted','simulated','failed','uncertain','cancelled')),
 attempts integer not null default 0, claimed_at timestamptz, claim_id uuid,
 provider_id text, result_code text, completed_at timestamptz,
 unique(cart_id,channel,step,dry_run)
);
create index recovery_jobs_due on public.recovery_jobs(state,due_at);
create index recovery_jobs_cart on public.recovery_jobs(cart_id);
create index recovery_jobs_provider on public.recovery_jobs(provider_id) where provider_id is not null;
create table public.recovery_attempts (
 id bigint generated always as identity primary key, job_id uuid references public.recovery_jobs(id) on delete cascade,
 cart_id uuid not null references public.recovery_carts(id) on delete cascade,
 channel text not null, result_code text not null, http_status integer,
 created_at timestamptz not null default now()
);
create table public.recovery_rate_limits (
 key text primary key, minute timestamptz not null, requests integer not null
);

-- No anonymous or customer SELECT on any customer data, tokens, logs, or credentials.
do $$ declare t text; begin
 foreach t in array array['recovery_settings','recovery_carts','recovery_consents','recovery_suppressions','recovery_links','recovery_jobs','recovery_attempts','recovery_rate_limits'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy recovery_admin_read on public.%I for select to authenticated using (public.has_role(_role => ''admin''::public.app_role, _user_id => (select auth.uid())))',t);
 end loop;
end $$;
grant usage,select on sequence public.recovery_consents_id_seq, public.recovery_attempts_id_seq to service_role;
create function public.recovery_rate_allow(p_key text,p_limit integer) returns boolean language plpgsql set search_path=public as $$
declare allowed boolean;
begin
 insert into recovery_rate_limits(key,minute,requests) values(p_key,date_trunc('minute',now()),1)
 on conflict(key) do update set minute=date_trunc('minute',now()),
  requests=case when recovery_rate_limits.minute<date_trunc('minute',now()) then 1 else recovery_rate_limits.requests+1 end
 where recovery_rate_limits.minute<date_trunc('minute',now()) or recovery_rate_limits.requests<p_limit
 returning true into allowed;
 return coalesce(allowed,false);
end $$;
-- Preferences are edited through the authenticated admin endpoint, never via a public API.

create function public.recovery_reconcile(p_user uuid default null) returns void language plpgsql set search_path=public as $$
begin
 update recovery_carts c set linked_order_id=m.order_id
 from (
  select distinct on (rc.id) rc.id cart_id,o.id order_id
  from recovery_carts rc join orders o on o.user_id=rc.owner_id and o.created_at>=rc.created_at
  where (p_user is null or rc.owner_id=p_user) and rc.status not in ('recovered','expired')
   and jsonb_array_length(rc.items)>0
   and (select jsonb_agg(jsonb_build_object('variant_id',v->>'variant_id','quantity',(v->>'quantity')::integer) order by v->>'variant_id') from jsonb_array_elements(rc.items) v)
      = (select jsonb_agg(jsonb_build_object('variant_id',oi.variant_id::text,'quantity',oi.quantity) order by oi.variant_id::text) from order_items oi where oi.order_id=o.id)
  order by rc.id, (o.payment_status in ('paid','pago')) desc,o.created_at desc
 ) m where c.id=m.cart_id;
 update recovery_carts c set status='recovered', recovered_order_id=o.id,recovered_value=o.total,
  recovered_at=coalesce(c.recovered_at,now()),sequence_cancelled=true
 from orders o where c.linked_order_id=o.id and o.payment_status in ('paid','pago') and c.status<>'recovered';
 update recovery_carts p set status='recovered',recovered_order_id=c.recovered_order_id,recovered_value=c.recovered_value,
  recovered_at=c.recovered_at,sequence_cancelled=true
 from recovery_carts c where c.parent_id=p.id and c.status='recovered' and p.status<>'recovered';
 update recovery_carts c set sequence_cancelled=true from orders o
 where c.linked_order_id=o.id and o.status in ('delivered','entregue','concluido','completed');
 update recovery_jobs j set state='cancelled',result_code='sequence_stopped',completed_at=now()
 from recovery_carts c where j.cart_id=c.id and j.state in ('queued','claimed')
 and (c.status in ('recovered','expired') or c.sequence_cancelled);
end $$;

create function public.recovery_order_changed() returns trigger language plpgsql security definer set search_path=public as $$
begin
 -- A recovery failure must never roll back a payment/order update.
 perform recovery_reconcile(new.user_id);
 return new;
exception when others then return new;
end $$;
create trigger recovery_payment_observer after update of total,payment_status,status on public.orders
 for each row execute function public.recovery_order_changed();

create function public.recovery_sync(p_hash text,p_user uuid,p_items jsonb,p_contact jsonb default null,p_consents jsonb default null,p_parent uuid default null)
returns uuid language plpgsql set search_path=public as $$
declare c recovery_carts%rowtype; ch text; recipient text; granted boolean; h text; total numeric;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_hash,0));
 select * into c from recovery_carts where session_hash=p_hash for update;
 if not found then
  if jsonb_array_length(p_items)=0 then return null; end if;
  insert into recovery_carts(session_hash,owner_id,parent_id) values(p_hash,p_user,p_parent) returning * into c;
 end if;
 if c.owner_id is not null and c.owner_id is distinct from p_user then raise exception 'Cart session unavailable'; end if;
 if c.status in ('recovered','expired') then return null; end if;
 select coalesce(sum((v->>'price')::numeric*(v->>'quantity')::integer),0) into total from jsonb_array_elements(p_items) v;
 update recovery_carts set owner_id=coalesce(owner_id,p_user), items=p_items,estimated_value=total,
  last_activity_at=now(),abandoned_at=null,status='active',
  customer_name=case when p_contact is null then customer_name else left(coalesce(p_contact->>'name',''),120) end,
  email=case when p_contact is null then email else left(coalesce(p_contact->>'email',''),160) end,
  phone=case when p_contact is null then phone else left(coalesce(p_contact->>'phone',''),20) end
 where id=c.id;
 -- A changed destination invalidates the old grant. Only explicit checkbox actions re-grant it.
 if p_contact is not null then
  if c.email<>coalesce(p_contact->>'email','') then update recovery_carts set email_consent=false where id=c.id; end if;
  if c.phone<>coalesce(p_contact->>'phone','') then update recovery_carts set whatsapp_consent=false where id=c.id; end if;
 end if;
 foreach ch in array array['email','whatsapp'] loop
  if p_consents is not null and p_consents ? ch then
   granted=(p_consents->ch->>'granted')::boolean;
   h=p_consents->ch->>'contact_hash';
   if h is null or length(h)<>64 then raise exception 'Consent destination required'; end if;
   insert into recovery_consents(cart_id,channel,granted,contact_hash) values(c.id,ch,granted,h);
   if granted then delete from recovery_suppressions where channel=ch and contact_hash=h; end if;
   if ch='email' then update recovery_carts set email_consent=granted where id=c.id;
   else update recovery_carts set whatsapp_consent=granted where id=c.id; end if;
  end if;
 end loop;
 update recovery_jobs j set state='cancelled',result_code='consent_revoked',completed_at=now()
 from recovery_carts rc where j.cart_id=rc.id and rc.id=c.id and j.state in ('queued','claimed')
 and ((j.channel='email' and not rc.email_consent) or (j.channel='whatsapp' and not rc.whatsapp_consent));
 -- Any real activity postpones waiting jobs until a new abandonment.
 update recovery_jobs set due_at=now()+interval '30 minutes'+make_interval(mins=>((select config->'steps'->step->>'minutes' from recovery_settings where id))::integer)
 where cart_id=c.id and state='queued';
 if p_parent is not null then
  update recovery_carts set status='recovering',sequence_cancelled=true where id=p_parent and status not in ('recovered','expired');
  update recovery_jobs set state='cancelled',result_code='customer_resumed' where cart_id=p_parent and state in ('queued','claimed');
 end if;
 return c.id;
end $$;

create function public.recovery_tick() returns void language plpgsql set search_path=public as $$
declare cfg jsonb;
begin
 perform pg_advisory_xact_lock(730019911);
 select config into cfg from recovery_settings where id;
 perform recovery_reconcile();
 update recovery_carts set status='expired',sequence_cancelled=true where expires_at<=now() and status<>'recovered';
 update recovery_carts set status='abandoned',abandoned_at=last_activity_at+interval '30 minutes'
 where status='active' and last_activity_at<=now()-interval '30 minutes' and jsonb_array_length(items)>0;
 update recovery_jobs j set state='cancelled',result_code='not_eligible',completed_at=now()
 from recovery_carts c where j.cart_id=c.id and j.state in ('queued','claimed') and
 (c.sequence_cancelled or c.status in ('expired','recovered') or (j.channel='email' and not c.email_consent) or (j.channel='whatsapp' and not c.whatsapp_consent));
 -- Never retry a stale claim automatically: the provider might already have accepted it.
 update recovery_jobs set state='uncertain',result_code='lease_expired_manual_review' where state='claimed' and claimed_at<now()-interval '5 minutes';
 if coalesce((cfg->>'enabled')::boolean,false) then
  insert into recovery_jobs(cart_id,channel,step,dry_run,due_at)
  select c.id,ch.channel,s.idx-1,(cfg->>'dry_run')::boolean,c.abandoned_at+make_interval(mins=>(s.value->>'minutes')::integer)
  from recovery_carts c cross join (values('email'),('whatsapp')) ch(channel)
  cross join jsonb_array_elements(cfg->'steps') with ordinality s(value,idx)
  where c.status in ('abandoned','recovering') and not c.sequence_cancelled and c.expires_at>now()
   and ((ch.channel='email' and c.email_consent and c.email<>'' and (cfg->>'email_enabled')::boolean)
     or(ch.channel='whatsapp' and c.whatsapp_consent and c.phone<>'' and (cfg->>'whatsapp_enabled')::boolean))
  on conflict(cart_id,channel,step,dry_run) do nothing;
 end if;
 delete from recovery_carts where last_activity_at<now()-make_interval(days=>coalesce((cfg->>'retention_days')::integer,30));
 delete from recovery_suppressions where created_at<now()-interval '180 days';
 delete from recovery_rate_limits where minute<now()-interval '10 minutes';
end $$;

create function public.recovery_eligible(p_job uuid) returns boolean language sql stable set search_path=public as $$
 select exists(select 1 from recovery_jobs j join recovery_carts c on c.id=j.cart_id cross join recovery_settings s
 where j.id=p_job and j.state in ('queued','claimed') and j.dry_run=(s.config->>'dry_run')::boolean
 and (s.config->>'enabled')::boolean and c.status in ('abandoned','recovering') and not c.sequence_cancelled
 and c.expires_at>now() and jsonb_array_length(c.items)>0 and c.last_activity_at<=now()-interval '30 minutes'
 and case when j.channel='email' then c.email_consent and (s.config->>'email_enabled')::boolean else c.whatsapp_consent and (s.config->>'whatsapp_enabled')::boolean end
 and not exists(select 1 from orders o where o.id=c.linked_order_id and (o.payment_status in ('paid','pago') or o.status in ('delivered','entregue','completed','concluido')
  or ((s.config->>'suppress_pending_pix')::boolean and o.payment_method='pix' and o.payment_status in ('pending','pendente') and o.status not in ('cancelled','cancelado'))))
 and not exists(select 1 from recovery_suppressions sp where sp.channel=j.channel and sp.contact_hash=
  (select co.contact_hash from recovery_consents co where co.cart_id=c.id and co.channel=j.channel order by co.created_at desc,co.id desc limit 1)));
$$;

create function public.recovery_claim(p_claim uuid) returns setof public.recovery_jobs language plpgsql set search_path=public as $$
begin
 return query update recovery_jobs j set state='claimed',claim_id=p_claim,claimed_at=now(),attempts=attempts+1
 where j.id in (select q.id from recovery_jobs q where q.state='queued' and q.due_at<=now()
 and q.attempts<coalesce((select (config->>'max_attempts')::integer from recovery_settings where id),3)
 and recovery_eligible(q.id) order by q.due_at for update skip locked limit 3)
 returning j.*;
end $$;

create function public.recovery_stop(p_cart uuid,p_channel text default null,p_hash text default null)
returns void language plpgsql set search_path=public as $$
begin
 if p_channel is null then
  update recovery_carts set sequence_cancelled=true where id=p_cart;
 else
  insert into recovery_suppressions(channel,contact_hash) values(p_channel,p_hash) on conflict do nothing;
  update recovery_carts c set email_consent=case when p_channel='email' then false else c.email_consent end,
   whatsapp_consent=case when p_channel='whatsapp' then false else c.whatsapp_consent end
  where c.id=p_cart or exists(select 1 from recovery_consents co where co.cart_id=c.id and co.channel=p_channel and co.contact_hash=p_hash);
  insert into recovery_consents(cart_id,channel,granted,contact_hash) select id,p_channel,false,p_hash from recovery_carts where id=p_cart;
 end if;
 update recovery_jobs j set state='cancelled',result_code='opt_out_or_admin_stop',completed_at=now()
 from recovery_carts c where j.cart_id=c.id and j.state in ('queued','claimed') and
 (c.sequence_cancelled or (j.channel='email' and not c.email_consent) or(j.channel='whatsapp' and not c.whatsapp_consent));
end $$;

-- All privileged operations are service-only; the Edge API validates capabilities/admin JWTs.
create function public.recovery_metrics() returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object(
  'abandoned',count(*) filter(where status in ('abandoned','recovering') and abandoned_at is not null),
  'potential',coalesce(sum(estimated_value) filter(where status in ('abandoned','recovering') and abandoned_at is not null),0),
  'recovered',count(*) filter(where status='recovered' and abandoned_at is not null),
  'revenue',coalesce(sum(recovered_value) filter(where status='recovered' and abandoned_at is not null),0),
  'rate',coalesce(round(100.0*count(*) filter(where status='recovered' and abandoned_at is not null)/nullif(count(*) filter(where abandoned_at is not null),0),2),0)
 ) from recovery_carts where parent_id is null;
$$;
create function public.recovery_scheduler_status() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare sweep boolean:=false; dispatch boolean:=false;
begin
 if to_regclass('cron.job') is not null then
  execute 'select exists(select 1 from cron.job where jobname=''3dflex-recovery-sweep'' and active), exists(select 1 from cron.job where jobname=''3dflex-recovery-dispatch'' and active)' into sweep,dispatch;
 end if;
 return jsonb_build_object('sweep',sweep,'dispatch',dispatch);
end $$;
revoke all on function public.recovery_order_changed() from public,anon,authenticated;
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('recovery_reconcile','recovery_sync','recovery_tick','recovery_eligible','recovery_claim','recovery_stop','recovery_metrics','recovery_scheduler_status','recovery_rate_allow') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
