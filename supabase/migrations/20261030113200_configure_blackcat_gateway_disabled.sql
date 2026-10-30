UPDATE public.payment_gateway_settings
SET provider = 'blackcat',
    environment = 'production',
    pix_enabled = false,
    updated_at = now()
WHERE id = 'main';
