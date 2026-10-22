-- Run once with an authorized database administrator, after reviewing the target rows.
-- Does not change prices, products, accessories, or payment configuration.
BEGIN;
SELECT pv.id, p.name, pv.color, pv.stock
FROM public.product_variants pv
JOIN public.products p ON p.id = pv.product_id
LEFT JOIN public.categories c ON c.id = p.category_id
WHERE p.name ILIKE '%filamento%' OR c.slug IN ('pla', 'petg');

UPDATE public.product_variants pv
SET stock = 1
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
WHERE pv.product_id = p.id
AND (p.name ILIKE '%filamento%' OR c.slug IN ('pla', 'petg'))
RETURNING pv.id, p.name, pv.color, pv.stock;
COMMIT;
