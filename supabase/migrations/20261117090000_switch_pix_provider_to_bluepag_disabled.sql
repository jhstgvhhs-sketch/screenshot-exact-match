-- Move the store preference away from Blackcat without enabling live Pix prematurely.
-- BluePag remains disabled until its Edge Function secrets are confirmed and a real payment test passes.
ALTER TABLE public.payment_gateway_settings
  DROP CONSTRAINT IF EXISTS payment_gateway_settings_provider_check;

ALTER TABLE public.payment_gateway_settings
  ADD CONSTRAINT payment_gateway_settings_provider_check
  CHECK (provider IN ('none', 'blackcat', 'bluepag', 'mercadopago', 'asaas', 'custom'));

UPDATE public.payment_gateway_settings
SET provider = 'bluepag',
    environment = 'production',
    pix_enabled = false,
    updated_at = now()
WHERE id = 'main';
