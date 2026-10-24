-- Read-only deployment checks. Run on the actual 3DFLEX backend after BOTH admin migrations.
-- No customer names, contacts, addresses, card data or payment payloads are returned.
select column_name,data_type from information_schema.columns
 where table_schema='public' and table_name='orders'
 and column_name in ('paid_at','tracking_carrier','tracking_code','tracking_url') order by column_name;
select p.proname,pg_get_function_identity_arguments(p.oid) arguments,p.prosecdef security_definer,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('admin_financial_report','admin_order_page','admin_customer_page','admin_save_tracking','tracking_email_claim') order by p.proname;
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('orders','order_items','profiles','products','product_variants','user_roles','admin_preferences','tracking_email_notifications','tracking_email_attempts') order by c.relname;
select tablename,policyname,roles,cmd,qual,with_check from pg_policies
 where schemaname='public' and tablename in ('orders','order_items','profiles','products','product_variants','user_roles','admin_preferences','tracking_email_notifications','tracking_email_attempts') order by tablename,policyname;
select count(*) paid_without_confirmation_date,coalesce(sum(total),0) value_without_confirmation_date
 from public.orders where payment_status in ('paid','pago') and status not in ('cancelled','cancelado') and paid_at is null;
select id,low_stock_limit from public.admin_preferences where id='main';
