WITH product AS (
  INSERT INTO public.products (
    category_id, name, slug, description, brand, material, weight, diameter,
    price, images, active, featured
  )
  VALUES (
    'b4e7e3a1-a8da-4b9b-b3ac-244af9e94f44',
    'Impressora 3D Bambu Lab A1 Combo',
    'bambu-lab-a1-combo',
    'A Bambu Lab A1 Combo reúne impressão FDM de alta velocidade e o sistema AMS Lite para impressão multicolorida em até 4 cores. Conta com calibração automática, compensação ativa de vazão e troca rápida do bico. O volume de impressão é de 256 × 256 × 256 mm, com velocidade máxima do cabeçote de 500 mm/s e temperatura máxima do hotend de 300 °C. É indicada principalmente para PLA, PETG, TPU e PVA. Por ter estrutura aberta, a fabricante não recomenda ABS, ASA, PC, PA e outros materiais de alta temperatura para uso comum neste modelo. O conjunto Combo inclui o AMS Lite.',
    'Bambu Lab',
    'Impressão FDM',
    '8,3 kg (peso líquido da impressora)',
    NULL,
    3800.00,
    ARRAY['https://store.bblcdn.com/s7/default/7295f2694b23422290eaba7d4ea66406/A1_C-compressed.jpg']::text[],
    true,
    false
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id=EXCLUDED.category_id,
    name=EXCLUDED.name,
    description=EXCLUDED.description,
    brand=EXCLUDED.brand,
    material=EXCLUDED.material,
    weight=EXCLUDED.weight,
    diameter=EXCLUDED.diameter,
    price=EXCLUDED.price,
    images=EXCLUDED.images,
    active=EXCLUDED.active,
    featured=EXCLUDED.featured
  RETURNING id
)
INSERT INTO public.product_variants (product_id,color,color_hex,sku,stock,sort)
SELECT id,'Padrão',NULL,'BAMBU-A1-COMBO',0,1 FROM product
ON CONFLICT (sku) DO UPDATE SET
  product_id=EXCLUDED.product_id,
  color='Padrão',
  color_hex=NULL,
  stock=0,
  sort=1;
