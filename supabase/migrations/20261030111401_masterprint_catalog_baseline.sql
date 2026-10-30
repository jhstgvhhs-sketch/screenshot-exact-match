BEGIN;

INSERT INTO public.products
  (category_id, name, slug, description, brand, material, weight, diameter, price, images, active, featured)
SELECT c.id, v.name, v.slug, v.description, 'MasterPrint', v.material, '1 kg', '1,75 mm', v.price, ARRAY[]::text[], true, false
FROM public.categories c
CROSS JOIN (VALUES
  ('MasterPrint PLA','masterprint-pla','Filamento PLA MasterPrint para impressão 3D. Rolo de 1 kg, diâmetro 1,75 mm.','PLA',59.90::numeric),
  ('MasterPrint PETG','masterprint-petg','Filamento PETG MasterPrint para impressão 3D. Rolo de 1 kg, diâmetro 1,75 mm.','PETG',49.90::numeric)
) AS v(name,slug,description,material,price)
WHERE c.slug = 'filamentos'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  brand = EXCLUDED.brand,
  material = EXCLUDED.material,
  weight = EXCLUDED.weight,
  diameter = EXCLUDED.diameter,
  price = EXCLUDED.price,
  active = true;

INSERT INTO public.product_variants (product_id, color, color_hex, sku, stock, sort)
SELECT p.id, v.color, v.hex, v.sku, 1, v.sort
FROM public.products p
CROSS JOIN (VALUES
  ('masterprint-pla','Branco','#F5F5F5','MP-PLA-BR',1),
  ('masterprint-pla','Preto','#171717','MP-PLA-PT',2),
  ('masterprint-pla','Marrom','#795548','MP-PLA-MR',3),
  ('masterprint-pla','Verde','#2E8B57','MP-PLA-VD',4),
  ('masterprint-pla','Rosa','#E88BAA','MP-PLA-RS',5),
  ('masterprint-pla','Rainbow','#B56CCB','MP-PLA-RB',6),
  ('masterprint-pla','Azul','#2474C8','MP-PLA-AZ',7),
  ('masterprint-pla','Cinza','#808080','MP-PLA-CZ',8),
  ('masterprint-pla','Prata','#A7A9AC','MP-PLA-PR',10),
  ('masterprint-pla','Dourado','#C9A227','MP-PLA-DO',11),
  ('masterprint-pla','Vermelho','#C62828','MP-PLA-VM',12),
  ('masterprint-pla','Amarelo','#F2D43D','MP-PLA-AM',13),
  ('masterprint-pla','Laranja','#F07824','MP-PLA-LA',14),
  ('masterprint-pla','Roxo','#743DA8','MP-PLA-RX',15),
  ('masterprint-pla','Rainbow Silk','#B56CCB','MP-PLA-RBS',17),
  ('masterprint-pla','Skin','#D6A078','MP-PLA-SK',18),
  ('masterprint-pla','Verde claro','#8BCB75','MP-PLA-VC',19),
  ('masterprint-pla','Verde escuro','#176B3A','MP-PLA-VE',20),
  ('masterprint-pla','Cobre','#B87333','MP-PLA-CB',21),
  ('masterprint-pla','Azul escuro','#173B70','MP-PLA-AE',22),
  ('masterprint-petg','Preto','#171717','MP-PETG-PT',1),
  ('masterprint-petg','Branco','#F5F5F5','MP-PETG-BR',2),
  ('masterprint-petg','Translúcido Amarelo','#F2D43D','MP-PETG-TA',3),
  ('masterprint-petg','Translúcido Azul','#2474C8','MP-PETG-TZA',4),
  ('masterprint-petg','Translúcido Vermelho','#C62828','MP-PETG-TV',5),
  ('masterprint-petg','Prata','#A7A9AC','MP-PETG-PR',6),
  ('masterprint-petg','Transparente','#D9E2EC','MP-PETG-TR',7),
  ('masterprint-petg','Marrom','#795548','MP-PETG-MR',8),
  ('masterprint-petg','Madeira','#A8794F','MP-PETG-MD',9),
  ('masterprint-petg','Fosco Branco','#E8E8E8','MP-PETG-FB',10),
  ('masterprint-petg','Fosforescente Rainbow','#B56CCB','MP-PETG-FR',11),
  ('masterprint-petg','Lavanda','#B39DDB','MP-PETG-LV',12),
  ('masterprint-petg','Fluorescente Roxo','#743DA8','MP-PETG-FRX',13),
  ('masterprint-petg','Fibra de Carbono','#454545','MP-PETG-FC',14)
) AS v(slug,color,hex,sku,sort)
WHERE p.slug = v.slug
ON CONFLICT (sku) DO NOTHING;

UPDATE public.products p
SET active = false
FROM public.categories c
WHERE p.category_id = c.id
  AND c.slug = 'filamentos'
  AND COALESCE(p.brand, '') <> 'MasterPrint';

COMMIT;
