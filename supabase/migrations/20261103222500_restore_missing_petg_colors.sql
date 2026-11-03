-- Restore the two PETG colors present in the original MasterPrint list.
-- The merchant set filament stock to 100 units per color.
INSERT INTO public.product_variants
  (product_id,color,color_hex,sku,stock,sort)
SELECT p.id, c.color, c.color_hex, c.sku, 100, c.sort
FROM public.products p
CROSS JOIN (VALUES
  ('Fosco Branco'::text,'#F2F2F2'::text,'MP-PETG-FB'::text,10),
  ('Lavanda'::text,'#B9A4D6'::text,'MP-PETG-LV'::text,12)
) AS c(color,color_hex,sku,sort)
WHERE p.slug='masterprint-petg'
  AND p.active
  AND NOT EXISTS (
    SELECT 1 FROM public.product_variants v
    WHERE v.product_id=p.id AND lower(v.color)=lower(c.color)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.product_variants v WHERE v.sku=c.sku
  );
