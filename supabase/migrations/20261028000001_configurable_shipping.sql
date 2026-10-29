-- Admin-configurable shipping settings, shared by the storefront and the authoritative order RPC.
BEGIN;

CREATE TABLE IF NOT EXISTS public.shipping_settings (
  id text PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  fixed_shipping_brl numeric(10,2) NOT NULL DEFAULT 37.80
    CHECK (fixed_shipping_brl >= 0 AND fixed_shipping_brl <= 5000),
  free_pix_shipping_enabled boolean NOT NULL DEFAULT true,
  free_pix_shipping_threshold_brl numeric(10,2) NOT NULL DEFAULT 600.00
    CHECK (free_pix_shipping_threshold_brl >= 0 AND free_pix_shipping_threshold_brl <= 1000000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shipping_settings IS
  'Public checkout freight rules. Only administrators may change these values.';
ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read shipping settings" ON public.shipping_settings;
CREATE POLICY "Public can read shipping settings"
  ON public.shipping_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert shipping settings" ON public.shipping_settings;
CREATE POLICY "Admins can insert shipping settings"
  ON public.shipping_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update shipping settings" ON public.shipping_settings;
CREATE POLICY "Admins can update shipping settings"
  ON public.shipping_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON public.shipping_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.shipping_settings TO authenticated;

INSERT INTO public.shipping_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- Keep this migration compatible with both the original checkout RPC and the
-- version where printer orders were already granted free shipping.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.place_order(jsonb,jsonb,text,text)'::regprocedure);
  old_pix_rule constant text := 'WHEN _method = ''pix'' AND _sub > 600';
  configurable_pix_rule constant text := 'WHEN _method = ''pix''
       AND COALESCE((SELECT free_pix_shipping_enabled FROM public.shipping_settings WHERE id = ''main''), true)
       AND _sub > COALESCE((SELECT free_pix_shipping_threshold_brl FROM public.shipping_settings WHERE id = ''main''), 600)';
  printer_and_pix_rule constant text := 'WHEN EXISTS (
       SELECT 1 FROM public.order_items oi_printer
       JOIN public.products p_printer ON p_printer.id = oi_printer.product_id
       JOIN public.categories c_printer ON c_printer.id = p_printer.category_id
       WHERE oi_printer.order_id = _order AND c_printer.slug = ''impressoras''
     ) THEN 0
     WHEN _method = ''pix''
       AND COALESCE((SELECT free_pix_shipping_enabled FROM public.shipping_settings WHERE id = ''main''), true)
       AND _sub > COALESCE((SELECT free_pix_shipping_threshold_brl FROM public.shipping_settings WHERE id = ''main''), 600)';
BEGIN
  IF position('shipping_settings' IN definition) > 0 THEN
    RETURN;
  END IF;

  IF position(old_pix_rule IN definition) = 0 OR position('ELSE 37.80' IN definition) = 0 THEN
    RAISE EXCEPTION 'place_order shipping rule changed; review the current function before applying configurable freight';
  END IF;

  IF position('oi_printer' IN definition) = 0 THEN
    definition := replace(definition, old_pix_rule, printer_and_pix_rule);
  ELSE
    definition := replace(definition, old_pix_rule, configurable_pix_rule);
  END IF;

  definition := replace(
    definition,
    'ELSE 37.80',
    'ELSE COALESCE((SELECT fixed_shipping_brl FROM public.shipping_settings WHERE id = ''main''), 37.80)'
  );

  EXECUTE definition;
END;
$migration$;

NOTIFY pgrst, 'reload schema';
COMMIT;
