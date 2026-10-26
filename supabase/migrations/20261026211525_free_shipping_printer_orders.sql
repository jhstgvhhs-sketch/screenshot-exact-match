-- Change only the freight branch of the existing checkout RPC; preserve its
-- authentication, prices, coupons, gifts, stock reservations and privileges.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.place_order(jsonb,jsonb,text,text)'::regprocedure);
BEGIN
  IF position('oi_printer' in definition) > 0 THEN RETURN; END IF;
  IF position('WHEN _method = ''pix'' AND _sub > 600' in definition) = 0 THEN
    RAISE EXCEPTION 'place_order shipping changed: review the current definition before applying';
  END IF;
  definition := replace(definition,
    'WHEN _method = ''pix'' AND _sub > 600',
    'WHEN EXISTS (
       SELECT 1 FROM public.order_items oi_printer
       JOIN public.products p_printer ON p_printer.id = oi_printer.product_id
       JOIN public.categories c_printer ON c_printer.id = p_printer.category_id
       WHERE oi_printer.order_id = _order AND c_printer.slug = ''impressoras''
     ) THEN 0
     WHEN _method = ''pix'' AND _sub > 600');
  EXECUTE definition;
END;
$migration$;
