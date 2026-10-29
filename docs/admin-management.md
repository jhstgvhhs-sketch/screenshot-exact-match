# Painel administrativo 3DFLEX

> Disponibilidade atual: consulte `docs/admin-runtime-fixes.md`. As preferências ausentes foram instaladas; a publicação das funções de recuperação e avisos é uma etapa distinta.
> Atualização: veja `docs/admin-audit.md` para as correções posteriores de financeiro, rastreamento, e-mail e segurança. O limite local de estoque baixo foi substituído por configuração compartilhada e o rateio passou a conciliar centavos exatos.

Implementação no projeto existente, com `/admin` preservado. A implantação no backend e a publicação da loja ficaram com o proprietário. O registro do código na main do GitHub não comprova implantação da migração nem publicação em produção.

## Organização

As áreas têm endereços próprios em `/admin?section=...`, suportam voltar/avançar do navegador e carregam somente a ferramenta escolhida. O formulário de autenticação permanece em `src/routes/admin.tsx`. O provedor existente em `src/lib/auth.tsx` agora limpa o estado administrativo imediatamente na troca de sessão e ignora consultas de permissão atrasadas após sair/trocar de conta. O layout usa menu lateral fixo/recolhível no desktop e menu móvel com fechamento por Escape, controle de foco e bloqueio da rolagem de fundo. Preto, laranja e grafite seguem os tokens da loja.

| Grupo | Seções |
| --- | --- |
| Visão geral | Dashboard |
| Vendas | Pedidos, clientes, carrinhos abandonados, cupons |
| Catálogo | Produtos, adicionar produto, categorias, estoque, avaliações |
| Financeiro | Visão financeira, relatórios de vendas, pagamentos |
| Marketing | Remarketing (configuração existente), automações (fila e histórico existentes) |
| Logística | Configurar frete, rastreamento, enviados, entregues |
| Sistema | Loja, pagamentos, notificações, segurança |

Não foi criada uma seção de campanhas: não há ferramenta de campanhas no projeto. Logística e pagamentos usam a mesma gestão de pedidos, sem duplicar regras. Segurança informa os controles existentes, sem botões fictícios nem exibição de credenciais. Recuperação conserva a mensagem de infraestrutura pendente quando as funções não estão disponíveis.

## Implantação pelo proprietário

1. Usar o código atualizado da main do GitHub para publicar a loja, preservando alterações posteriores. Não sobrescrever a branch remota à força.
2. No backend **wexuhtwkwtieaiebhnje**, revisar e aplicar as migrações pendentes `supabase/migrations/20261024114941_admin_management_dashboard.sql` e `supabase/migrations/20261028000001_configurable_shipping.sql`, na ordem cronológica. A migração de recuperação já foi instalada; não reaplicá-la por causa desta entrega.
3. Publicar o frontend. Este painel não exige novas Edge Functions nem novos Secrets. As funções/agendamentos da recuperação continuam seguindo `docs/cart-recovery.md`, independentemente desta migração.
4. Entrar com uma conta administrativa real e executar a conferência manual abaixo. Sem a nova migração, dashboard, clientes e listas de pedidos exibem erro de infraestrutura em vez de resultados fabricados. Catálogo e configurações permanecem independentes.

A migração acrescenta `orders.paid_at`, `order_items.material_snapshot`, índices, dois observadores de inserção/atualização e três RPCs de consulta: `admin_financial_report`, `admin_customer_page`, `admin_order_page`. Não substitui `place_order`, liquidação Pix, reserva/liberação de estoque, webhook, autenticação, RLS ou permissões das tabelas existentes. Não altera produtos, preços, fretes, gateways ou registros financeiros históricos.

As RPCs usam **SECURITY INVOKER**, mantêm as políticas de RLS e exigem `has_role` com argumentos nomeados. Visitantes não recebem EXECUTE; usuários comuns autenticados são recusados antes da consulta. Os testes SQL exercitam os papéis reais `anon` e `authenticated` em um banco local isolado. A auditoria do backend de produção não foi executada por falta de acesso direto autorizado pela conexão.

## Critérios financeiros

- Faturamento: soma de `orders.total`, uma vez por pedido cujo pagamento está `paid` ou `pago`, excluindo pedidos `cancelled`/`cancelado`. Inclui frete; não representa lucro.
- Datas: `paid_at` em **America/Sao_Paulo**, intervalo inclusivo de datas locais com limite superior exclusivo no SQL. Hoje é o dia local; sete dias são hoje e os seis anteriores. Mês é do primeiro dia até hoje. Intervalos personalizados têm no máximo 367 dias.
- Ticket: faturamento confirmado dividido pela quantidade de pedidos pagos no intervalo; retorna zero se não houver pedidos pagos.
- Total de pedidos e pendências: data de criação no período selecionado. Pendentes usam exclusivamente `pending`/`pendente`, excluindo cancelados; expirados e falhas não entram em valor pendente.
- Arquivamento não apaga faturamento. Na lista de pedidos, o administrador pode incluir arquivados.
- **Pedidos antigos pagos sem data não recebem uma data inventada.** O painel mostra sua quantidade e valor separadamente, fora dos indicadores temporais. O observador registra a primeira transição futura para pago e preserva esse instante em alterações posteriores. Uma edição comum de `paid_at` não pode fabricar datas.
- Produtos e cores usam `order_items.product_name`, `color`, `unit_price` e `quantity`, gravados no pedido. O agrupamento por produto utiliza seu identificador; cores são agrupadas por material registrado e nome da cor.
- Material histórico não era registrado: novos itens recebem o material do produto no momento da inserção; itens anteriores ficam como **Material não registrado**. Não deduzimos PLA/PETG do nome ou do catálogo atual.
- Valores por item: `(total - frete)` rateado proporcionalmente ao valor bruto de cada linha. Assim os descontos entram nos rankings. Arredondamento para centavos por agrupamento pode causar diferenças de R$ 0,01 entre agrupamentos independentes. CSV segue o mesmo critério.
- O gráfico de métodos distingue pagos (data da confirmação) de pendentes (data da criação), explicitamente identificados. Somente métodos efetivamente registrados são mostrados.
- Sem fonte confiável de sessões, a conversão exibe **Dados de visitas ainda não disponíveis**. Uma futura integração deverá fornecer sessões deduplicadas, período/fuso e atribuição das compras; cadastros/carrinhos não serão usados como denominador.
- CSV usa apenas agregados filtrados e não inclui nomes, e-mails, telefones, endereços ou dados de cartão. Células são escapadas contra fórmulas de planilha.

## Funcionalidades preservadas

- Editores de produto, imagem, categorias, publicação de rascunhos e moderação/adição de avaliações foram reaproveitados, sem recriação do catálogo.
- Exclusão individual de cor mantém a verificação de pedidos vinculados e a proteção da última variante. A nova inclusão de cor cria apenas uma variante, com SKU único e estoque explícito.
- Filtros de produtos: nome, categoria, material PLA/PETG, ativo/inativo. A edição mantém preço no nível do produto, conforme o modelo comercial existente; não foi criado preço independente por cor.
- Limite de estoque baixo é uma preferência visual local do navegador (padrão 3), claramente identificada; nunca muda quantidades.
- Cadastro de produto continua criando um rascunho inativo com estoque inicial de uma unidade por cor; material e marca agora podem ser informados explicitamente. Nenhum cadastro ocorre sem envio do formulário.
- Pedidos têm detalhe com itens, frete, descontos, pagamento, cliente, endereço e rastreamento, sem CPF. Busca aceita início do identificador mostrado, nome ou e-mail. Histórico de alterações detalhado não existe no banco e é identificado como indisponível.
- Salvar andamento não envia `payment_status`. Confirmar recebimento é uma ação separada e mantém as confirmações explícitas existentes; não gera cobrança. Arquivar continua usando `archive_order_admin`.
- Clientes são perfis cadastrados, paginados, com quantidade de pedidos e compras pagas incluindo arquivados, excluindo cancelados. O e-mail vem do pedido mais recente, quando disponível; não foi criada consulta ao schema Auth. O histórico do cliente reutiliza a gestão de pedidos.
- Cupons usam a tabela e regras existentes; criação e ativação/desativação exigem ações explícitas e confirmação.
- Gateway, notificações e configurações usam seus componentes atuais. A seção **Configurar frete** salva o frete fixo e a regra de frete grátis no Pix em `shipping_settings`; carrinho e checkout leem esses valores e a RPC `place_order` os aplica no servidor. Frete grátis de impressoras permanece obrigatório. A migração precisa ser aplicada no backend correto para que a configuração afete os novos pedidos. O restante da integração Blackcat, QR Pix, cartão e automações do servidor não é alterado por essa tela. O cabeçalho/rodapé público e os avisos de compra ficam fora de `/admin`; as páginas públicas continuam usando-os.

## Validação

Executados localmente:

- `npm test`: 101 testes passaram, incluindo testes existentes de checkout, frete, QR Pix, catálogo e recuperação, mais testes administrativos.
- `npx tsc --noEmit`: tipos de toda a aplicação.
- `npm run build`: compilação cliente/servidor.
- ESLint das áreas novas e da rota administrativa; avisos de Fast Refresh não afetam a compilação.
- SQL real via PGlite: aritmética, datas na fronteira UTC/São Paulo, cancelamentos, arquivados, histórico sem data, captura da confirmação, material histórico, pesquisa por prefixo do pedido e autorização.
- Interface via Testing Library: login, bloqueio de usuário comum, menu móvel, menu recolhível, links por seção, detalhes de pedido, proteção da confirmação, salvamento do andamento sem alteração financeira, edição de estoque, integridade da cor e cadastro inativo.

**Limite da validação:** o navegador remoto não alcançou o servidor local (`ERR_CONNECTION_REFUSED`). Não houve inspeção visual em navegador real/mobile nem login em produção. Testes de interface são locais com dados sintéticos isolados; nenhum pedido, pagamento, mensagem ou estoque de produção foi usado para simular resultados.

Conferência após publicar: acessar `/admin` com admin e com usuário comum; abrir cada seção; conferir saldos com pedidos efetivamente pagos; testar filtro por período e CSV; abrir detalhes e códigos de rastreio sem salvar mudanças reais; conferir edição de catálogo sem confirmar gravação; verificar o menu em celular; conferir carrinho e checkout público sem gerar cobranças. Não ativar remarketing apenas para validar esta interface.

## Arquivos

- `src/routes/admin.tsx`, `src/routes/__root.tsx`, `src/components/site/Header.tsx`, `src/components/site/AbandonedCarts.tsx`.
- `src/components/admin/{AdminWorkspace,AdminUi,FinancialDashboard,OrdersPage,CustomersPage,CatalogPage,CatalogEditors,CouponsPage}.tsx`.
- `src/lib/admin-finance.ts`, `src/lib/auth.tsx`.
- `supabase/migrations/20261024114941_admin_management_dashboard.sql`.
- `src/test/admin-{access,navigation,orders,catalog}.test.tsx`, `src/test/admin-finance.test.ts`, `src/test/admin-finance-database.test.ts`.
- `src/test/admin-auth-session.test.tsx` (isolamento de sessão e falha de consulta de permissão).
- `src/test/abandoned-carts-admin.test.tsx` (separação das áreas de carrinhos e automação).
- Este documento.
