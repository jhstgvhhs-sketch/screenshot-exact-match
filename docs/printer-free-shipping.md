# Frete grátis para impressoras

## Regra preparada

Qualquer pedido que contenha pelo menos um produto da categoria cadastrada `impressoras` tem frete zero, no Pix ou cartão e sem valor mínimo. A isenção abrange o pedido misto com impressora e outros itens. Sem impressora, permanecem R$ 37,80 e gratuidade exclusivamente no Pix para subtotal superior a R$ 600,00 (R$ 600,00 exatos não qualificam).

O carrinho, checkout, mensagem manual de cartão, página de produto, cabeçalho e informações de envio foram atualizados. A categoria é recarregada do catálogo nos carrinhos antigos e na revisão antes do pagamento. Não se usa nome, slug do produto ou um sinalizador enviado pelo navegador como autoridade do frete.

## Backend e publicação — pendentes de aplicação pelo proprietário

Como a publicação foi reservada ao proprietário, **esta entrega altera o código no GitHub e não ativa a regra no servidor de produção**. A função atual `place_order` foi consultada em modo somente leitura; a migração ainda não foi aplicada ao ambiente ativo.

Publicar os componentes juntos, nesta ordem:

1. Publicar a Edge Function `blackcat-create-pix`, incluindo os arquivos `_shared` atualizados. A validação permite frete zero abaixo de R$ 600 somente para uma categoria de impressora consultada pelo servidor a partir dos itens do pedido. Não remover a validação de valor, CPF, quantidade ou soma dos itens. Preservar a configuração de autenticação, os secrets e o webhook existentes.
2. Aplicar `supabase/migrations/20261026211525_free_shipping_printer_orders.sql` no banco da loja. A migração altera somente o trecho de frete de `place_order`, mantém suas permissões existentes e interrompe se a definição esperada tiver mudado. Não recalcula pedidos anteriores nem altera estoque/produtos.
3. Publicar `recovery-carts` para que links de recuperação retornem a categoria real, e publicar o frontend.
4. Conferir no site publicado os resumos de impressora e de pedido sem impressora, sem gerar cobrança durante a conferência visual.

Somente publicar o frontend não atualiza a regra autoritativa do pedido no banco. O ambiente correto da loja é o identificado pelo `supabase/config.toml`; não usar outro projeto conectado por engano.

## Testes executados

- 281 testes / 57 arquivos aprovados, incluindo cenários novos de impressora no Pix/cartão, pedido misto, frete normal, limite de R$ 600 e mensagem de cartão com total sem frete.
- Migração aplicada duas vezes em banco PostgreSQL isolado (PGlite), com criação de pedidos de teste apenas nesse banco. Testes verificam totais, categorias, quantidades inválidas e preservação das regras sem impressora.
- Teste de payload Pix aceita frete zero em impressora abaixo de R$ 600 e rejeita acessório cujo nome apenas contenha “impressora”.
- Teste da interface do checkout confirma frete zero ao trocar para cartão, sem exibir a oferta indevida de frete exclusivo do Pix.
- Teste de revisão do catálogo substitui categoria divergente salva no navegador.
- TypeScript e build de produção aprovados.
- Não foram criadas cobranças, mensagens nem pedidos reais. Não foi realizada uma nova inspeção visual em navegador: o script temporário de QA da sessão anterior não estava disponível. A interface do checkout foi validada por teste de componente.

## Arquivos

`src/lib/{shipping.ts,cart.tsx,checkout.ts,checkout-review.ts}`, rotas de produto/carrinho/checkout/início, `Header`, `StoreBenefits`, `StoreInformation`, funções `blackcat-create-pix`, `_shared/blackcat-payload`, `recovery-carts`, a migração citada, testes de frete/payload/revisão/checkout e este relatório.
