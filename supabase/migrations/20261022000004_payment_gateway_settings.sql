-- Safe non-secret gateway preferences. API keys belong in Edge Function Secrets, never this table.
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
 id text PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
 provider text NOT NULL DEFAULT 'none' CHECK (provider IN ('none','mercadopago','asaas','custom')),
 environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','production')),
 pix_enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.payment_gateway_settings TO authenticated;
DROP POLICY IF EXISTS "Admins can view gateway preferences" ON public.payment_gateway_settings;
CREATE POLICY "Admins can view gateway preferences" ON public.payment_gateway_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can insert gateway preferences" ON public.payment_gateway_settings;
CREATE POLICY "Admins can insert gateway preferences" ON public.payment_gateway_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can update gateway preferences" ON public.payment_gateway_settings;
CREATE POLICY "Admins can update gateway preferences" ON public.payment_gateway_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
INSERT INTO public.payment_gateway_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;
