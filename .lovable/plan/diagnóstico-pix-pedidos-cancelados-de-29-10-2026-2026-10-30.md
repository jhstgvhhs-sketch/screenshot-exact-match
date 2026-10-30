# Diagnóstico Pix — pedidos cancelados de 29/10/2026

Nada foi alterado. Só fiz leituras.

## O que os dados mostram

| Pedido | Criado (UTC) | Itens | Total | Registro Pix |
|---|---|---|---|---|
| f2d68251 | 29/10 02:10 | 1x PLA (categoria `pla`), R$59,90 | R$97,70 | nenhum |
| 5d8438be | 29/10 12:54 | igual | R$97,70 | nenhum |
| 94d39046 | 29/10 13:04 | igual | R$97,70 | nenhum |

- Nos três pedidos os dados estão corretos: CPF com 11 dígitos, telefone com 11, CEP com 8, frete R$37,80 igual ao valor configurado, e 59,90 + 37,80 = 97,70. O montador da cobrança aceitaria esses dados.
- Os três estão como `cancelado/cancelado`. O único código que cancela pedido Pix é a própria função `blackcat-create-pix`, na etapa de segurança antes de chamar a Blackcat (passos "post-order-validation" ou "unexpected-pre-charge"). Isso explica por que nenhuma cobrança chegou na Blackcat: a função falhou **depois de criar o pedido e antes de chamar o gateway**, e devolveu o estoque.
- Se a função tivesse pedido a cobrança à Blackcat, o pedido continuaria pendente, e não cancelado.

## Etapa exata, deduzida pelo código e pelos horários

- Até o commit `a668ce9` (29/10 12:59 UTC), a etapa 3 lia os itens do pedido com `order_items → products(categories(slug))`. O banco **não tem ligação (chave estrangeira) entre `order_items.product_id` e `products`**, como confirmei agora. Por isso essa leitura falha, a função cai no cancelamento e responde "Não foi possível gerar o Pix agora".
- f2d68251 (02:10) e 5d8438be (12:54) aconteceram antes dessa correção, então batem com essa falha.
- 94d39046 (13:04) aconteceu 5 minutos depois do commit da correção. Isso indica que a função publicada **ainda não tinha a correção**, porque commits no GitHub não publicam a função sozinhos. A melhoria de diagnóstico (`fbe19d4`, 13:47 UTC) também é posterior a todas as tentativas.

## O que não deu para confirmar

- **Logs reais**: os registros de logs ficam guardados só por cerca de 1 hora. Hoje não há nenhuma linha de `blackcat-create-pix` de 29/10. Por isso o motivo exato gravado nos logs não pode mais ser lido.
- **Versão publicada**: não existe ferramenta de leitura que mostre o código publicado. Não dá para provar se a versão publicada é a atual (`fbe19d4`). Os horários indicam que pelo menos a tentativa das 13:04 rodou uma versão sem a correção.

## Configurações (só presença)

- BLACKCAT_PIX_ENABLED: presente
- BLACKCAT_API_KEY: presente
- BLACKCAT_WEBHOOK_URL: presente

## Próximo ajuste mínimo (precisa da sua autorização)

1. Republicar **somente** `blackcat-create-pix` (com `_shared/blackcat.ts` e `_shared/blackcat-payload.ts`) a partir do código atual (`fbe19d4`), sem editar nenhum arquivo. Isso coloca no ar a leitura corrigida sem depender da ligação que falta, e também os logs com o motivo de cada falha.
2. Você faz uma única tentativa real de Pix no site, com o mesmo produto.
3. Logo em seguida (no máximo 1 hora depois), eu leio os logs. Se ainda falhar, o log vai mostrar o motivo exato (por exemplo `order-items-read-failed:<código>` ou o erro de categoria), e aí o ajuste é pontual.

Alternativa sem republicar: criar no banco a ligação entre `order_items.product_id` e `products`. Não recomendo agora, porque muda o banco e o código atual já não depende dela.

Os pedidos órfãos de R$1,00 (1bcbd124 e e9643b3a) continuam pendentes e foram mantidos como estão.
