DELETE FROM public.product_variants
WHERE sku = 'MP-PLA-RB'
  AND color = 'Rainbow'
  AND NOT EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.variant_id = product_variants.id
  );
