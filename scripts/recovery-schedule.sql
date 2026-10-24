-- Apply only after the recovery migration. This first job never calls a provider.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('3dflex-recovery-sweep','*/5 * * * *','select public.recovery_tick()');
update public.recovery_runtime set sweep_registered=true,registered_at=now() where id;

-- Optional dispatch: needs RECOVERY_CRON_SECRET and RECOVERY_PUBLIC_ORIGIN/links in Edge Secrets.
-- Store the SAME cron secret in Vault as recovery_cron_secret, and the backend URL as recovery_backend_url.
-- Never paste actual secret values into GitHub, SQL migration history, or this file.
-- Provision Vault secrets through the private operator interface, then run the block below.
-- When the two Vault entries are absent this installs only the safe database sweep.
do $$ begin
 if to_regclass('vault.decrypted_secrets') is not null and exists(select 1 from pg_available_extensions where name='pg_net') then
  execute 'create extension if not exists pg_net with schema extensions';
  if (select count(*) from vault.decrypted_secrets where name in ('recovery_cron_secret','recovery_backend_url'))=2 then
   perform cron.schedule('3dflex-recovery-dispatch','* * * * *',
    $job$select net.http_post(
     url:=(select decrypted_secret from vault.decrypted_secrets where name='recovery_backend_url')||'/functions/v1/recovery-worker',
     headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='recovery_cron_secret')),
     body:='{}'::jsonb,timeout_milliseconds:=60000
    )$job$);
   update public.recovery_runtime set dispatch_registered=true,registered_at=now() where id;
  end if;
 end if;
end $$;
select public.recovery_scheduler_status();
