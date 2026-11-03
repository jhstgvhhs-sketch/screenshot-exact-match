UPDATE public.payment_gateway_settings
SET provider='blackcat',
    environment='production',
    pix_enabled=true,
    updated_at=now()
WHERE id='main';