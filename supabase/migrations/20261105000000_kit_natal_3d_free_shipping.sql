-- Give the Kit Natal 3D free shipping nationwide, regardless of payment method or cart value.
-- The decision is made from the product linked to the persisted order item, never browser input.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.place_order(jsonb,jsonb,text,text)'::regprocedure);
  target text := '    WHEN EXISTS (
      SELECT 1
      FROM public.order_items oi_printer';
  replacement text := '    WHEN EXISTS (
      SELECT 1 FROM public.order_items oi_kit
      JOIN public.products p_kit ON p_kit.id = oi_kit.product_id
      WHERE oi_kit.order_id = _order AND p_kit.slug = ''kit-natal-3d''
    ) THEN 0
    WHEN EXISTS (
      SELECT 1
      FROM public.order_items oi_printer';
BEGIN
  IF position('p_kit.slug = ''kit-natal-3d''' IN definition) > 0 THEN RETURN; END IF;
  IF position(target IN definition) = 0 THEN
    RAISE EXCEPTION 'place_order shipping rule changed; review before applying Kit Natal 3D free shipping';
  END IF;
  definition := replace(definition, target, replacement);
  EXECUTE definition;
END;
$migration$;
