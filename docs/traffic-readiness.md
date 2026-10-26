# 3DFLEX — preparação para tráfego pago

## Problemas identificados e correções

- Mensagem inicial “Pix em breve” estava desatualizada; substituída por orientação para Pix no checkout e cartão de crédito pelo WhatsApp. A disponibilidade efetiva continua dependendo do servidor, sem prometer aprovação de pagamento ao abrir a página.
- A consulta do Pix reconhecia apenas `pago`; agora usa a mesma camada de apresentação que pedidos e ADM. Reconhece `paid/pago`, `pending/pendente`, `cancelled/cancelado`, `expired/expirado`, `refunded/estornado` e falhas. Valores desconhecidos ficam em verificação, nunca são tratados como aprovados. Não há gravação financeira nessa camada.
- Corrigidos textos de erro e 404 em inglês. Removida mensagem antiga de Pix indisponível em um resultado de cartão. Cartão sem atendimento configurado falha antes de registrar um novo pedido. Erros técnicos de geração Pix não são exibidos diretamente ao consumidor.
- Revisados os textos das superfícies alteradas. Textos fornecidos pelo administrador, descrições de produtos, slides e depoimentos existentes não foram sobrescritos; a revisão de conteúdo editorial completo depende da conferência desses cadastros pela loja.
- Produtos recebem títulos e descrições reais, Open Graph, URL canônica e JSON-LD Product/Offer com preço BRL. Variante válida na URL informa cor, SKU e imagem correspondentes. Não foram inventadas avaliações, médias ou especificações.
- Disponibilidade distingue estoque, filamentos sob encomenda conforme a regra existente e acessórios indisponíveis. Produtos inativos não são carregados publicamente. Ausência de produto gera HTTP 404.
- Catálogo com metadados específicos por categoria, busca sem indexação, tratamento de erro e correção do filtro PLA. O sitemap consulta somente slugs de produtos ativos, com paginação e resposta 503 em caso de falha, sem ocultá-la como sitemap vazio.
- Robots e metadados restringem indexação de checkout, carrinho, conta, ADM e recuperação. Isso complementa a autenticação; não substitui autorização.
- Galeria com miniaturas, ampliação acessível, proporções preservadas e controles de cores maiores. A cor muda a imagem; a foto da variante no carrinho permanece correta mesmo ao visualizar outras miniaturas.
- Compra mantém limites de quantidade, preços, CEP e frete existentes. Apresenta condições de entrega e solicitação de nota/rastreio pelo WhatsApp, sem prazo inventado.
- Login e cadastro rápidos dentro do checkout, sem navegar para fora nem limpar dados preenchidos. Conta continua necessária: o backend atual vincula pedidos ao usuário autenticado. Checkout visitante não foi habilitado sem um mecanismo equivalente de acesso, proteção contra abuso e acompanhamento. Essa é a alternativa segura prevista no pedido.
- Páginas institucionais usam títulos/descrições específicos e contatos reais das configurações. Páginas de termos e trocas continuam claramente incompletas, sem indexação; não foram inventadas políticas comerciais ou jurídicas.

## Auditoria do backend real — somente leitura

- `admin_financial_report` existe no banco utilizado pela loja, com verificação administrativa, fuso `America/Sao_Paulo`, pagamentos `paid/pago`, exclusão de cancelados e recortes por `paid_at`. Valores pendentes e receita permanecem separados; não foi alterada a função financeira.
- Trigger `admin_payment_timestamp` está ativa e registra a primeira transição para pagamento confirmado; atualizações posteriores preservam o instante original.
- Existe **um pedido de cartão marcado `paid` sem `paid_at`**. Nenhuma data foi preenchida. O relatório mantém esses pedidos fora dos períodos e os aponta em `undatedPaid/undatedValue`. A regularização depende de evidência financeira confiável.
- Dados observados também incluem pedido Pix pendente. Nenhum pedido, pagamento, estoque, produto, avaliação ou preferência de produção foi modificado nesta etapa.
- Nenhuma migration ou alteração de permissão foi necessária. Não foram alteradas funções Blackcat, credenciais, switches de produção, preços, cupom, brindes ou regras de frete.

## Validação

- 241 testes automatizados aprovados (49 arquivos): compatibilidade de status, checkout, frete exclusivo Pix acima de R$ 600,00, cupom/brindes, carrinho/quantidades, autenticação, relatórios, datas, rankings, permissões, galeria e SEO, além das funcionalidades anteriores.
- Liquidação Pix testada em PostgreSQL isolado: pagamento carimba data uma vez, repetição não duplica liquidação, divergência de valor é rejeitada, cancelamento/expiração devolvem estoque uma única vez e execução por cliente comum é bloqueada.
- TypeScript e build verificados. Lint dos módulos e testes novos verificado. Os testes antigos de gráficos em jsdom emitem avisos de SVG, sem falhas.
- HTTP local com servidor real: início 200, checkout 200 com `noindex`, sitemap 200 com dois produtos ativos, produto inexistente 404. Produto PETG real respondeu 200 com título dinâmico, canônica, galeria e JSON-LD Product/BRL no HTML servido.
- Testes não executados: cobrança real, entrega de webhook pelo provedor, autenticação de cliente real, cadastro real, conciliação com extrato e inspeção visual em navegador desktop/celular/tablet. O navegador de testes disponível não tinha o executável instalado. Os testes de interface são automatizados em DOM e a validação HTTP não equivale a inspeção visual.

## Pendências antes de ampliar o tráfego

1. O proprietário publica a interface e confere os fluxos na URL de produção. Commit no GitHub não é publicação do site.
2. Validar login, cadastro/confirmação de e-mail, checkout e galeria em aparelhos reais. Não executar cobrança sem autorização específica.
3. Conferir a configuração efetiva do gateway e o recebimento de webhooks no ambiente publicado. Testes isolados não comprovam operação do provedor em produção.
4. Publicar políticas de trocas/devoluções e termos definitivos. Os dados legais, contatos e descrições fornecidos pela loja precisam ser revisados pelo responsável.
5. Se adotar domínio próprio, configurar `VITE_SITE_URL` com a origem HTTPS e atualizar a linha Sitemap de `public/robots.txt`. A origem atual é `https://screen-into-sites.lovable.app`. Enviar o sitemap ao Search Console depende da conta e propriedade de domínio.
6. Resolver o pedido histórico sem data apenas com comprovante confiável. Não houve backfill automático.
7. Métricas reais de sessões/conversões e ativação do remarketing continuam dependendo de configuração própria; foram preservadas e não são declaradas concluídas nesta entrega.

## Arquivos desta entrega

- `public/robots.txt`
- `src/components/CheckoutAuth.tsx`
- `src/components/CustomerOrders.tsx`
- `src/components/PixPaymentStatus.tsx`
- `src/components/admin/OrdersPage.tsx`
- `src/components/site/CustomerOrderAdmin.tsx`
- `src/components/site/StoreInformation.tsx`
- `src/lib/catalog.ts`
- `src/lib/error-page.ts`
- `src/lib/payment-status.ts`
- `src/lib/seo.ts`
- `src/lib/sitemap.ts`
- `src/routes/__root.tsx`
- `src/routes/carrinho.tsx`
- `src/routes/checkout.tsx`
- `src/routes/conta.tsx`
- `src/routes/index.tsx`
- `src/routes/info.$slug.tsx`
- `src/routes/produto.$slug.tsx`
- `src/routes/produtos.tsx`
- `src/server.ts`
- `src/test/checkout-auth.test.tsx`
- `src/test/payment-status.test.ts`
- `src/test/pix-settlement-database.test.ts`
- `src/test/product-experience.test.tsx`
- `src/test/seo.test.ts`
- `src/test/sitemap.test.ts`
- `docs/traffic-readiness.md`
