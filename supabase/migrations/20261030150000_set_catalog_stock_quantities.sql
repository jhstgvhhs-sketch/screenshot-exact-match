-- Set the stock quantities explicitly provided by the merchant.
-- Active filament variants: 100 units per color.
-- Active printer and accessory variants: 10 units per product.
UPDATE public.product_variants v
SET stock = CASE
  WHEN c.slug = 'filamentos' THEN 100
  WHEN c.slug IN ('impressoras', 'acessorios') THEN 10
  ELSE v.stock
END
FROM public.products p
JOIN public.categories c ON c.id = p.category_id
WHERE v.product_id = p.id
  AND p.active = true
  AND c.slug IN ('filamentos', 'impressoras', 'acessorios');
