-- Add requested 3DFLEX printer and accessory catalog, PLA colors and filament photos.
-- New variants and products start with stock=0 until the merchant provides quantities.
-- Existing product prices and stock are preserved except for the specifically listed catalog items.

UPDATE public.products
SET description = 'Filamento PLA MasterPrint para impressão 3D. Bobina com 1 kg de material e diâmetro de 1,75 mm. Temperatura de extrusão recomendada: 190–220 °C; mesa: 40–60 °C. O PLA oferece impressão simples, boa estabilidade dimensional e acabamento visual definido, sendo indicado para peças decorativas, protótipos, miniaturas, brinquedos e projetos de uso geral.',
    images = ARRAY['https://down-br.img.susercontent.com/file/br-11134207-820l4-mnxnh5eq2zus2e','','','','','','','','','','','https://images1.kabum.com.br/produtos/fotos/sync_mirakl/953611/xlarge/Filamento-De-Impressora-3d-PLA-1-75mm-1Kg-Rosa-Masterprint-Cor-Vibrante-para-Projetos-Criativos_1776712729.png','https://cdn.awsli.com.br/600x700/1993/1993007/produto/1640464122a85eb5c6a.jpg','https://www.toptonernet.com.br/storage/empresas/08863077000105/produtos/jb32p6g82W5OgHT3B4INUXwmkZABCr-metaV2hhdHNBcHAgSW1hZ2UgMjAyNi0wMy0wNCBhdCAxMi4xNi41Mi5qcGVn-_principal.png','','','','','','https://images1.kabum.com.br/produtos/fotos/sync_mirakl/953611/xlarge/Filamento-De-Impressora-3d-PLA-1-75mm-1Kg-Rosa-Masterprint-Cor-Vibrante-para-Projetos-Criativos_1776712729.png','https://dcdn-us.mitiendanube.com/stores/007/692/841/products/a9c68596369d933ab886be7ac9601c30-39cbcd4d854a08f68617882287480378-480-0.webp','https://www.filamenthub.com.au/cdn/shop/files/MintGreen_grande.jpg?v=1756721966']::text[]
WHERE slug='masterprint-pla';

UPDATE public.products
SET description = 'Filamento PETG MasterPrint para impressão 3D. Bobina com 1 kg de material e diâmetro de 1,75 mm. Temperatura de extrusão recomendada: 220–240 °C; mesa: 70–90 °C. O PETG combina resistência mecânica, leve flexibilidade e baixa tendência à deformação, sendo indicado para peças funcionais, suportes, protótipos e objetos que exigem maior durabilidade.',
    images = ARRAY[
      'https://images.tcdn.com.br/img/img_prod/1432261/filamento_3d_masterprint_petg_preto_1kg_175mm_1_20251112175346_1bc1fde15ba4.jpg'
    ]::text[]
WHERE slug='masterprint-petg';

INSERT INTO public.product_variants (product_id,color,color_hex,sku,stock,sort)
SELECT p.id,c.color,c.color_hex,c.sku,0,c.sort
FROM public.products p
CROSS JOIN (VALUES
  ('Rosa BB','#F3AFC5','MP-PLA-RBB',20),
('Azul BB','#9CC9EB','MP-PLA-ABB',21),
('Verde translúcido','#70B99A','MP-PLA-VTR',22)
) AS c(color,color_hex,sku,sort)
WHERE p.slug='masterprint-pla'
ON CONFLICT (product_id,color) DO UPDATE
SET color_hex=EXCLUDED.color_hex, sku=EXCLUDED.sku, sort=EXCLUDED.sort;

WITH catalog(category_slug,name,slug,brand,material,weight,diameter,description,price,images) AS (
  VALUES
  ('impressoras','Impressora 3D Bambu Lab A1','impressora-3d-bambu-lab-a1','Bambu Lab','FDM/FFF',NULL,NULL,'A Bambu Lab A1 é uma impressora FDM de estrutura aberta, com volume de construção de 256 × 256 × 256 mm. Possui calibração automática, compensação ativa de fluxo e bico de troca rápida. A velocidade máxima informada pela fabricante é de até 500 mm/s. Compatível com filamentos como PLA e PETG; o AMS Lite é um acessório vendido separadamente nesta versão.

No cartão: 10x de R$ 169,91 sem juros.',1699.10,ARRAY['https://www.pbtech.co.nz/imgprod/P/T/PTRBAM0008.jpg?h=805467945']::text[]),
('impressoras','Impressora 3D Bambu Lab A1 Mini','impressora-3d-bambu-lab-a1-mini','Bambu Lab','FDM/FFF',NULL,NULL,'Impressora 3D FDM compacta, com volume de construção de 180 × 180 × 180 mm. Conta com calibração automática, compensação ativa de fluxo e operação simplificada para projetos do dia a dia. Pode ser integrada ao sistema AMS Lite compatível para impressão multicolorida, vendido separadamente nesta versão.

No cartão: 10x de R$ 217,90 sem juros.',961.10,ARRAY['https://store.bblcdn.com/s6/default/285ba330154b4c35a60ff060a4addb2e/Group48089.png']::text[]),
('impressoras','Impressora 3D Bambu Lab P2S Combo','impressora-3d-bambu-lab-p2s-combo','Bambu Lab','FDM/FFF',NULL,NULL,'Conjunto Combo da Bambu Lab com impressora de estrutura fechada e sistema AMS 2 Pro para gerenciamento automático de filamentos e trabalhos multicoloridos. A câmara de impressão tem volume de 256 × 256 × 256 mm. O sistema AMS 2 Pro também oferece gerenciamento e secagem de filamentos, conforme as condições de uso do fabricante.

No cartão: 10x de R$ 939,90 sem juros.',7459.10,ARRAY['https://3dcentral.com.au/cdn/shop/files/p2scombo.png?v=1760345674&width=1000']::text[]),
('impressoras','Impressora Bambu Lab A1 Mini Combo','impressora-bambu-lab-a1-mini-combo','Bambu Lab','FDM/FFF',NULL,NULL,'Versão Combo da A1 Mini, acompanhada do AMS Lite para impressão multicolorida com até quatro carretéis. Possui volume de construção de 180 × 180 × 180 mm, calibração automática e compensação ativa de fluxo. Indicada para miniaturas, peças decorativas, protótipos e projetos compactos.

No cartão: 10x de R$ 359,90 sem juros.',2239.10,ARRAY['https://cdn-reichelt.de/bilder/web/xxl_ws/I200/BAMBU_LAB_A1_MINI_COMBO_ANW_01.png?type=ProductXxl']::text[]),
('impressoras','Impressora Bambu Lab X2D Combo','impressora-bambu-lab-x2d-combo','Bambu Lab','FDM/FFF',NULL,NULL,'Impressora FDM CoreXY de câmara fechada, com sistema de dois bicos no cabeçote para ampliar as possibilidades de impressão com materiais diferentes. A versão Combo acompanha o AMS 2 Pro para alimentação automática de filamentos. Volume de impressão principal de 256 × 256 × 260 mm; a área útil pode variar conforme o bico utilizado.

No cartão: 10x de R$ 1.169,90 sem juros.',9529.10,ARRAY['https://hips.hearstapps.com/vader-prod.s3.amazonaws.com/product-images/14213592-1d18-4ece-a0d6-ff7b9b76c542/2445f051-0195-46f6-8b9c-1f6a80038718.jpg?resize=980%3A%2A']::text[]),
('impressoras','Impressora Bambu Lab A2L Combo','impressora-bambu-lab-a2l-combo','Bambu Lab','FDM/FFF',NULL,NULL,'Impressora 3D de grande formato com volume de construção de 330 × 320 × 325 mm. A versão Combo acompanha sistema AMS Lite para alimentação automática e impressão multicolorida. Conta com extrusor servo, calibração automática e velocidade máxima de cabeçote de até 500 mm/s.

No cartão: 10x de R$ 689,90 sem juros.',5209.10,ARRAY['https://3d.nice-cdn.com/upload/image/product/large/default/bambu-lab-a2l-combo-2882916-sv.png']::text[]),
('impressoras','Impressora Bambu Lab A2L','impressora-bambu-lab-a2l','Bambu Lab','FDM/FFF',NULL,NULL,'Impressora 3D FDM de grande formato, com área de construção de 330 × 320 × 325 mm. Possui extrusor servo, engrenagens endurecidas, calibração automática e velocidade máxima de cabeçote de até 500 mm/s. Compatível com filamentos de 1,75 mm; sistema AMS Lite não incluso nesta versão.

No cartão: 10x de R$ 512,90 sem juros.',3616.10,ARRAY['https://store.bblcdn.com/s7/default/98fcc354dba84a078a80b6063365e852/3.jpg__op__resize%2Cm_lfit%2Cw_640__op__format%2Cf_auto__op__quality%2Cq_80']::text[]),
('impressoras','Impressora 3D Bambu Lab P1S','impressora-3d-bambu-lab-p1s','Bambu Lab','FDM/FFF',NULL,NULL,'Impressora 3D CoreXY com câmara fechada e volume de construção de 256 × 256 × 256 mm. Possui hotend totalmente metálico com temperatura máxima de 300 °C, velocidade máxima de cabeçote de até 500 mm/s e controle de ventilação da câmara. Compatível com o sistema AMS, vendido separadamente nesta versão.

No cartão: 10x de R$ 599,90 sem juros.',4999.00,ARRAY['https://static.wixstatic.com/media/67789a_1af1bae906b942388f00d0d74143ae14~mv2.png/v1/fill/w_1270%2Ch_1076%2Cal_c%2Cq_90%2Cenc_avif%2Cquality_auto/67789a_1af1bae906b942388f00d0d74143ae14~mv2.png']::text[]),
('impressoras','Impressora Bambu Lab P1S Combo','impressora-bambu-lab-p1s-combo','Bambu Lab','FDM/FFF',NULL,NULL,'Conjunto Combo da P1S com impressora CoreXY de câmara fechada e sistema AMS para alimentação automática e impressão multicolorida. Tem volume de construção de 256 × 256 × 256 mm, hotend totalmente metálico e velocidade máxima de cabeçote de até 500 mm/s.

No cartão: 10x de R$ 629,90 sem juros.',5299.00,ARRAY['https://asset.dynamism.com/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/b/a/bambu_lab_p1s_combo.png']::text[]),
('impressoras','Impressora 3D Elegoo Centauri Carbon 2 Combo','impressora-3d-elegoo-centauri-carbon-2-combo','Elegoo','FDM/FFF',NULL,NULL,'Impressora CoreXY de câmara fechada com volume de construção de 256 × 256 × 256 mm. A versão Combo utiliza o sistema CANVAS para impressão em até quatro cores, com troca automática de filamentos. Conta com calibração automática, bico de até 350 °C e velocidade máxima de até 500 mm/s.

No cartão: 10x de R$ 503,41 sem juros.',5034.05,ARRAY['https://majkl3d-admin.s18.cdn-upgates.com/_cache/2/c/2cbfa2012c85e884e713ab8215fe03ed-elegoo-centauri-carbon-2-combo-33952.jpg']::text[]),
('impressoras','Impressora 3D Flashforge Adventure AD5X + Kit de Enclausuramento','impressora-3d-flashforge-adventure-ad5x-kit-enclausuramento','Flashforge','FDM/FFF',NULL,NULL,'Impressora FDM CoreXY com volume de construção de 220 × 220 × 220 mm, nivelamento automático e sistema IFS para alimentação e impressão em até quatro cores. Acompanha kit de enclausuramento para ajudar a proteger a área de impressão e manter o ambiente de trabalho mais controlado. Velocidade de impressão de até 300 mm/s, conforme material e configuração.

No cartão: 10x de R$ 379,91 sem juros.',3799.05,ARRAY['https://cdn.vnda.com.br/loja3d/2026/06/16/17_42_19_204_998a6b6f5d07b26909aca71a78dd5720.png?v=1782314102']::text[]),
('acessorios','Placa Fria (Cool Plate) compatível com Bambu Lab A1/P1/X1 – Multfila','placa-fria-cool-plate-bambu-lab-a1-p1-x1-multfila','Multfila','Placa de impressão 3D',NULL,NULL,'Superfície de impressão fria compatível com os modelos Bambu Lab A1, P1 e X1 indicados pelo fornecedor. Projetada para oferecer uma base de impressão adequada e facilitar a remoção das peças após o resfriamento. Confira o modelo da impressora antes da compra.',122.31,ARRAY['https://www.innocube3d.com/cdn/shop/files/20251003100602_188_5_color_White_PicCopilot_5a4c8.png?v=1763883936']::text[]),
('acessorios','Hotend com Bico de Aço Endurecido 0,2 mm – Série A1','hotend-aco-endurecido-02mm-serie-a1','Compatível com Bambu Lab','Hotend / bico de reposição',NULL,NULL,'Conjunto hotend com bico de aço endurecido de 0,2 mm para a série Bambu Lab A1. O diâmetro menor é indicado para trabalhos que exigem mais definição e detalhes finos. A compatibilidade deve ser conferida com a versão exata da impressora.',266.40,ARRAY['https://i.ebayimg.com/images/g/ejsAAeSwWfppJleB/s-l1200.png']::text[]),
('acessorios','Placa PEI Texturizado Dourada Dupla Face A1/P1/X1 – Multfila','placa-pei-texturizado-dourado-dupla-face-a1-p1-x1-multfila','Multfila','Placa PEI para impressão 3D',NULL,NULL,'Placa PEI texturizada de dupla face com acabamento dourado, compatível com os modelos Bambu Lab A1, P1 e X1 indicados pelo fornecedor. A superfície texturizada ajuda na aderência da primeira camada e pode deixar uma textura característica na face inferior da peça. Verifique o tamanho e a compatibilidade antes da compra.',134.10,ARRAY['https://www.3d-drucker-experte.de/media/image/d6/68/6d/Modefine3D-PEI-01-0001-3D-Drucker-Experte.jpg']::text[]),
('acessorios','Placa Fria Pro (Cool Plate) Bambu Lab A1/P1/X1 – Multfila','placa-fria-pro-cool-plate-bambu-lab-a1-p1-x1-multfila','Multfila','Placa de impressão 3D',NULL,NULL,'Placa fria Pro para impressão 3D, compatível com os modelos Bambu Lab A1, P1 e X1 indicados pelo fornecedor. A superfície foi desenvolvida para uso como base de impressão e remoção das peças após o resfriamento. Confirme a versão da mesa antes de comprar.',179.91,ARRAY['https://static.wixstatic.com/media/d49faf_e53c725c2c524cdc8665993275762cc4~mv2.jpg/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/d49faf_e53c725c2c524cdc8665993275762cc4~mv2.jpg']::text[]),
('acessorios','Hotend de Aço Inoxidável 0,2 mm – Série X1 e P1','hotend-aco-inoxidavel-02mm-serie-x1-p1','Compatível com Bambu Lab','Hotend / bico de reposição',NULL,NULL,'Hotend com bico de aço inoxidável de 0,2 mm para as séries Bambu Lab X1 e P1. O bico de menor diâmetro permite trabalhar com camadas e detalhes mais finos. Confira a versão exata da máquina e o tipo de conjunto antes da instalação.',288.00,ARRAY['https://hotend.s23.cdn-upgates.com/_cache/c/d/cd5da81475d36a84c54b8a1074d7341a-bambu-lab-hotend-s-tryskou-z-nerezove-oceli-0-2-mm-rada-p1.jpg']::text[]),
('acessorios','Conjunto Hotend Completo de Aço Endurecido 0,4 mm – Série P1','conjunto-hotend-completo-aco-endurecido-04mm-serie-p1','Compatível com Bambu Lab','Hotend / bico de reposição',NULL,NULL,'Conjunto hotend completo com bico de aço endurecido de 0,4 mm para a série Bambu Lab P1. O diâmetro de 0,4 mm é uma opção versátil para impressões gerais, equilibrando velocidade e definição. Verifique a compatibilidade do conjunto com sua impressora.',539.10,ARRAY['https://store.bblcdn.eu/s8/default/a71f545246a44224a44d7cbf30231c40/0.4mm.png']::text[]),
('acessorios','Secador de Filamento 3D Drybox PrintaLot','secador-filamento-3d-drybox-printalot','PrintaLot','Secador / armazenamento de filamento',NULL,NULL,'Drybox para auxiliar na conservação e alimentação do filamento durante a impressão 3D. O armazenamento com controle de umidade ajuda a reduzir a absorção de água pelo material, contribuindo para uma extrusão mais estável. Consulte as instruções do fabricante para uso e faixa de temperatura.',405.00,ARRAY['https://cdn.awsli.com.br/2500x2500/567/567324/produto/219136600/drybox-bc-1-m5pempsgvf.jpg']::text[]),
('acessorios','Bico 0,25 mm para Impressora 3D AD5X – Flashforge','bico-025mm-impressora-3d-ad5x-flashforge','Flashforge','Bico de reposição',NULL,NULL,'Bico de reposição de 0,25 mm para a impressora Flashforge AD5X. A abertura menor favorece a reprodução de detalhes delicados e linhas mais finas, com possível aumento no tempo de impressão. Confirme o modelo e o encaixe antes da instalação.',230.22,ARRAY['https://eu.flashforge.com/cdn/shop/files/5X-0.25.webp?v=1779254177&width=1600']::text[]),
('acessorios','Hotend de Aço Endurecido 0,6 mm – Série X1 e P1','hotend-aco-endurecido-06mm-serie-x1-p1','Compatível com Bambu Lab','Hotend / bico de reposição',NULL,NULL,'Hotend com bico de aço endurecido de 0,6 mm para as séries Bambu Lab X1 e P1. O diâmetro maior permite extrusão de linhas mais largas e pode reduzir o tempo em peças volumosas, além de ser uma opção para materiais abrasivos compatíveis. Verifique o modelo antes da compra.',279.00,ARRAY['https://store.bblcdn.com/0167e8f50c7c40b486c146b1d0b46a94.png']::text[]),
('acessorios','Placa Fria (Cool Plate) compatível com Bambu Lab H2D – Multfila','placa-fria-cool-plate-bambu-lab-h2d-multfila','Multfila','Placa de impressão 3D',NULL,NULL,'Placa fria de impressão compatível com Bambu Lab H2D, conforme especificação do fornecedor. Desenvolvida para servir como superfície de construção e facilitar a remoção das peças após o resfriamento. Confirme a compatibilidade com a sua versão da H2D.',251.91,ARRAY['https://slickpurchase.com/cdn/shop/files/41WjjwaHsoL_grande.jpg?v=1774514723']::text[]),
('acessorios','Módulo IFS 4 Cores Flashforge AD5X','modulo-ifs-4-cores-flashforge-ad5x','Flashforge','Sistema de alimentação multicolorida',NULL,NULL,'Módulo IFS para a Flashforge AD5X, projetado para gerenciar até quatro filamentos e realizar trocas automáticas de cor durante a impressão. Auxilia na alimentação do material e em projetos multicoloridos.

No cartão: 10x de R$ 145,00 sem juros.',1305.00,ARRAY['https://filament2print.com/18224-large_default/ifs-flashforge-ad5x.jpg']::text[]),
('acessorios','Kit de Ferramentas 35 em 1 para Impressão 3D com Bolsa Organizadora – Multfila','kit-ferramentas-35-em-1-impressao-3d-multfila','Multfila','Ferramentas para manutenção',NULL,NULL,'Kit de ferramentas 35 em 1 para apoiar tarefas de montagem, manutenção e acabamento em projetos de impressão 3D. Acompanha estojo organizador para manter os acessórios reunidos e facilitar o transporte. Confira a composição do kit nas imagens do produto.',100.00,ARRAY['https://www.mintion.net/cdn/shop/files/3dprintertoolkit_1.jpg?v=1754573469']::text[]),
('acessorios','Caneta Multpen de Impressão 3D','caneta-multpen-impressao-3d',NULL,'Caneta de impressão 3D',NULL,NULL,'Caneta de impressão 3D para desenhar, criar formas e fazer pequenos complementos manualmente com filamento. Indicada para trabalhos criativos, artesanato, protótipos e acabamento de peças. Use filamento compatível com o modelo e siga as orientações de temperatura do fabricante.',229.00,ARRAY['https://down-br.img.susercontent.com/file/br-11134207-7qukw-lk5sybyofdlv81']::text[]),
('acessorios','Resina UV Fotopolimerizável para Impressão 3D 200 g – Multfila','resina-uv-fotopolimerizavel-impressao-3d-200g-multfila','Multfila','Resina fotopolimérica UV',NULL,NULL,'Resina fotopolimérica UV em embalagem de 200 g para aplicações de impressão 3D compatíveis com resina. Deve ser utilizada em equipamento adequado e curada conforme as orientações do fabricante. Utilize luvas, proteção para os olhos e manuseie em local ventilado.',85.90,ARRAY['https://www.arttreecreations.com.au/cdn/shop/files/DSC03394.jpg?v=1683005437&width=2048']::text[]),
('acessorios','Resina UV Fotopolimerizável para Impressão 3D 100 g – Multfila','resina-uv-fotopolimerizavel-impressao-3d-100g-multfila','Multfila','Resina fotopolimérica UV',NULL,NULL,'Resina fotopolimérica UV em embalagem de 100 g para aplicações de impressão 3D compatíveis com resina. Deve ser utilizada em equipamento adequado e curada conforme as orientações do fabricante. Utilize luvas, proteção para os olhos e manuseie em local ventilado.',62.00,ARRAY['https://www.arttreecreations.com.au/cdn/shop/files/DSC03394.jpg?v=1683005437&width=2048']::text[]),
('acessorios','Kit de Canetas Acrílicas 48 Cores 3D Maker – Multfila','kit-canetas-acrilicas-48-cores-3d-maker-multfila','3D Maker / Multfila','Canetas acrílicas',NULL,NULL,'Conjunto com 48 cores de canetas acrílicas para pintura, identificação e acabamento de peças impressas em 3D. Indicado para personalizar modelos, miniaturas, peças decorativas e projetos artesanais. Verifique os materiais compatíveis e o tempo de secagem informado pelo fabricante.',134.00,ARRAY['https://dam.elcorteingles.es/producto/www-001006610419043-05.jpg']::text[]),
('acessorios','Parafusadeira Elétrica Recarregável de Precisão Multfila com 48 Bits','parafusadeira-eletrica-precisao-multfila-48-bits','Multfila','Ferramenta elétrica de precisão',NULL,NULL,'Parafusadeira elétrica recarregável de precisão, acompanhada por conjunto de 48 bits para diferentes tipos de parafusos. Indicada para trabalhos delicados de montagem, manutenção e pequenos reparos em equipamentos e acessórios. Use a ponteira adequada e evite aplicar força excessiva em componentes plásticos.',251.00,ARRAY['https://s.alicdn.com/@sc04/kf/H4c40718978b64eaaa32204f40843ce780/Ananke-Tools-DIY-48-1Mini-Electric-Iphone-Repair-Tool-Kit-Precision-Screwdriver-Rechargeable-3.6V-Battery-0.35Nm-Max-Torque.jpg']::text[])
),
upserted AS (
  INSERT INTO public.products (
    category_id,name,slug,brand,material,weight,diameter,description,price,images,active,featured
  )
  SELECT c.id,d.name,d.slug,d.brand,d.material,d.weight,d.diameter,d.description,d.price,d.images,true,false
  FROM catalog d
  JOIN public.categories c ON c.slug=d.category_slug
  ON CONFLICT (slug) DO UPDATE SET
    category_id=EXCLUDED.category_id,
    name=EXCLUDED.name,
    brand=EXCLUDED.brand,
    material=EXCLUDED.material,
    weight=EXCLUDED.weight,
    diameter=EXCLUDED.diameter,
    description=EXCLUDED.description,
    price=EXCLUDED.price,
    images=EXCLUDED.images,
    active=true,
    featured=false
  RETURNING id,slug
)
INSERT INTO public.product_variants (product_id,color,color_hex,sku,stock,sort)
SELECT p.id,'Padrão',NULL,'CAT-'||upper(replace(p.slug,'-','_')),0,1
FROM public.products p
JOIN catalog d ON d.slug=p.slug
ON CONFLICT (sku) DO UPDATE SET
  product_id=EXCLUDED.product_id,
  color=EXCLUDED.color,
  color_hex=EXCLUDED.color_hex,
  sort=EXCLUDED.sort;
