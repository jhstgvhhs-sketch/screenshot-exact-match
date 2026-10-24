# 3DFLEX — auditoria do painel e rastreamento

> Disponibilidade atual: consulte `docs/admin-runtime-fixes.md`. As preferências ausentes foram instaladas; a publicação das funções de recuperação e avisos é uma etapa distinta.
## Estado da entrega

Correções no projeto existente, preservando layout, navegação, identidade visual, regras comerciais e integrações. O registro do código no GitHub é separado da implantação no banco e da publicação da loja, que continuam com o proprietário.

**Produção:** a conexão Supabase recusou a consulta de metadados do backend `wexuhtwkwtieaiebhnje`. A verificação HTTP somente de leitura da API pública desse mesmo backend retornou **404 / PGRST202** para `admin_financial_report`; o HEAD de `admin_order_page` também retornou 404. Isso confirma indisponibilidade pela API atual, mas não diferencia migração ausente de schema cache desatualizado. Não foram consultados dados pessoais nem extraídos valores de pedidos reais. Não é possível confirmar nesta entrega os registros antigos sem data nem as políticas efetivamente instaladas em produção.

## Correções realizadas

- Consulta financeira com erro é identificada como erro de infraestrutura, com tentativa novamente; não exibe faturamento zero para esconder uma falha.
- O rateio do valor efetivamente recebido pelos itens agora distribui **centavos inteiros**, com desempate pelo ID do item. Produtos, materiais e cores conciliam exatamente com `total - shipping`, inclusive descontos fracionários. O ticket é arredondado no SQL para duas casas.
- CSV preserva duas casas decimais para dinheiro, mantém quantidades inteiras e continua protegendo fórmulas, aspas e dados pessoais.
- Pedidos pagos sem itens são sinalizados: entram no faturamento, mas nenhum produto é inventado no ranking.
- Rastreamento passa a ter transportadora, código existente e URL oficial informada pelo administrador. Salvamento ocorre em uma RPC administrativa independente de andamento/pagamento.
- WhatsApp utiliza exclusivamente `wa.me` com telefone do pedido, sem API contratada e sem automação. Requer rastreio completo salvo e andamento enviado.
- E-mail usa Resend e a mesma `RESEND_API_KEY` já prevista na recuperação. O destinatário vem do banco; a requisição do navegador aceita somente ID do pedido e operação. Há domínio verificado, modelo HTML preto/laranja/branco, teste sem envio, trava adicional de habilitação, histórico e deduplicação persistente.
- Minha Conta > Meus Pedidos mostra transportadora, código e botão de rastrear. A consulta continua filtrada por proprietário, com RLS e paginação. Se somente as novas colunas ainda não existirem, o histórico anterior é consultado sem elas, preservando código e pedidos. Erros de sessão/permissão não acionam esse fallback. O detalhe administrativo mantém o mesmo cuidado.
- Limite de estoque baixo passa a ser compartilhado no banco; alterações só são salvas por ação explícita e nunca atualizam variantes.
- A regra antiga de bootstrap de administrador em cadastro público foi removida para **novos cadastros**. Contas, perfis e papéis existentes são preservados. Criar conta pública não autoriza o ADM, mesmo que não exista outro administrador. A concessão futura é feita pelo responsável pelo backend.

## Financeiro validado localmente

- Hoje, últimos sete dias, mês atual e período personalizado usam `paid_at` em `America/Sao_Paulo`, com início inclusivo e fim exclusivo.
- Pagamentos `paid`/`pago` entram uma vez por pedido, excluindo pedidos cancelados. Pendentes e expirados não entram em faturamento. Arquivamento não apaga vendas.
- Pendências e total de pedidos usam criação no período; os gráficos informam esse critério, distinto da confirmação para vendas pagas.
- Faturamento usa o total efetivamente registrado, incluindo frete e descontos do pedido. Não representa lucro. Rankings distribuem `total - frete` entre os itens comprados; não dependem de preços atuais.
- Ticket = faturamento confirmado / número de pedidos pagos, zero quando não há pagamentos no período, arredondado para centavos.
- Rankings usam nome/cor/quantidade/preço gravados em `order_items`, e material capturado para novas compras. Material histórico ausente permanece identificado como não registrado.
- Datas de confirmação antigas ausentes não são inventadas. O observador existente captura o instante de registro da confirmação futura no banco, não presume que esse seja um horário de transação fornecido pela Blackcat.
- Gráficos e exportação usam o mesmo resultado da RPC. Conversão continua indisponível sem uma fonte real de sessões.

Não houve alteração de liquidação Blackcat, valor de frete, preços, produtos, reserva/baixa/liberação de estoque, pedidos ou pagamentos reais.

## Rastreamento e WhatsApp

`admin_save_tracking` exige usuário autenticado com papel administrativo e conserva RLS. Atualiza somente `tracking_carrier`, `tracking_code` e `tracking_url`. Código e transportadora limitados a 120 caracteres; URL limitada a 2048, HTTPS, sem credenciais, espaços, IP literal ou porta não padrão. O banco também valida o formato; o frontend não é a única proteção.

O cadastro do código **não** marca pedido como enviado/entregue e não muda pagamento. Para notificar, o administrador deve primeiro salvar os três campos e depois marcar o andamento como enviado, caso corresponda ao envio real. Clientes podem consultar apenas seus pedidos e não podem editar o rastreamento.

WhatsApp: aceita DDD brasileiro válido, celular com nove dígitos ou telefone fixo com oito, com/sem prefixo 55. Números inválidos são bloqueados, sem substituir pelo WhatsApp da loja. O destinatário do link é exclusivamente o telefone salvo no pedido. A mensagem reproduz o texto solicitado, com cliente, pedido, transportadora, código e URL. A abertura não é registrada como envio; confirmação é manual no aplicativo. A validação é de formato: não comprova titularidade do telefone nem se o número está cadastrado no WhatsApp.

O endereço da transportadora é fornecido pelo administrador: a validação de HTTPS não certifica que um domínio pertença à empresa. O backend nunca visita esse link. Não há busca automática de eventos da transportadora; este recurso fornece acompanhamento pelo site informado.

## E-mail e resultados reais

A função `tracking-email` usa validação do JWT real e consulta de `user_roles` no servidor, reaproveitando `requireAdmin`. Não aceita endereço de destinatário no corpo da requisição. Não há token de provedor no frontend, no banco público ou neste relatório.

Configuração privada no servidor:

| Secret | Uso |
| --- | --- |
| `RESEND_API_KEY` | Mesma credencial do provedor já previsto no projeto; deve permitir consultar domínios e enviar e-mail |
| `TRACKING_EMAIL_FROM` | Endereço de remetente autorizado, no formato `loja@dominio`; se ausente, reaproveita `RECOVERY_EMAIL_FROM` |
| `TRACKING_EMAIL_ENABLED` | Precisa ser exatamente `true` para envio real; ausente/false mantém envios bloqueados |

A presença das credenciais não comprova domínio aprovado. Antes de transmitir conteúdo ao provedor, a função consulta os domínios e exige o remetente verificado. Se o domínio não aparecer na primeira página de 100 domínios, o envio é bloqueado; contas com mais domínios precisam ampliar essa verificação antes de uso.

Deduplicação por pedido + hash do destinatário e dos dados salvos de rastreamento/mensagem. Claim atômico no banco, restrito a `service_role`, e `Idempotency-Key` estável no Resend. A trava local persiste além da janela de 24 horas da chave do provedor. Aceitos, em processamento e resultados incertos não são reenviados por cliques repetidos. Só rejeições conhecidas admitem nova tentativa explícita após um minuto, até três tentativas. Nunca há retry automático.

Estados registrados: bloqueado por configuração, processamento iniciado, aceito pelo provedor, falha conhecida ou resultado incerto. Timeout, HTTP 408/409/5xx ou resposta de envio desconhecida não são tratados como rejeição segura para repetir. Falha de gravação do histórico interrompe o fluxo antes do envio quando possível; após uma chamada de resultado incerto, consultar o Resend antes de repetir.

**Aceito pelo Resend não significa entregue na caixa do cliente.** Esta entrega não adiciona webhook de confirmação de entrega transacional; a interface deixa essa limitação explícita. Provas de entrega, bounce e reclamação para rastreamento dependem de futura conciliação/webhook. O webhook já existente da recuperação permanece intacto.

A função relê pedido/telefone/destinatário/rastreio antes de solicitar o envio. Alterações detectadas interrompem a tentativa. Existe uma pequena janela inevitável entre essa leitura e a aceitação externa; mensagem já em trânsito no provedor não pode ser recolhida. Não existem disparos em massa nem mensagens promocionais.

## Migrations e publicação pelo proprietário

1. Confirmar o backend **wexuhtwkwtieaiebhnje**; não usar o outro projeto Supabase conectado chamado 333.
2. Conferir o histórico de migrações. Se ainda ausente, aplicar `20261024114941_admin_management_dashboard.sql` (painel anterior). Não reaplicar uma migração já instalada.
3. Aplicar `20261024121752_tracking_and_admin_audit.sql` em uma transação, somente após a anterior. Ela cria duas colunas de rastreamento, preferência compartilhada, tabelas de auditoria de e-mail, RPC de salvar e de claim, validação HTTPS e a correção financeira/cadastro. Não remove registros. No final há notificação para atualização do schema cache do PostgREST.
4. Publicar somente a nova Edge Function `tracking-email`, com `_shared/tracking-*` e os helpers `_shared/recovery-server.ts`, `recovery-rules.ts` já existentes. Usar `supabase/config.toml`: `verify_jwt=false` apenas no gateway dessa função; a autorização administrativa é obrigatória dentro do handler. Não desligar validações internas. Não exige redeploy Blackcat nem alteração dos webhooks existentes.
5. Publicar o frontend atualizado. Executar `scripts/verify-admin-audit.sql` para conferir funções, ACLs, RLS, colunas e quantidade agregada de pagamentos antigos sem data, sem expor dados pessoais.
6. Configurar remetente/Resend em Secrets somente no servidor. Manter `TRACKING_EMAIL_ENABLED` ausente/false durante testes. Não é necessário habilitar remarketing para usar rastreamento.

## Testes e limites

**Aprovados localmente:** suíte completa de 145 testes, incluindo os existentes de login, QR, checkout, frete, carrinho, catálogo, variantes e recuperação; novos testes de financeiro, gráficos, filtros, CSV, SQL, rastreamento, permissões, WhatsApp, área do cliente, preferência compartilhada e função de e-mail. Testes de provedor usam respostas simuladas isoladas, sem rede externa. PGlite executa as migrations reais e as políticas reais do schema inicial, além das regras novas, com papéis `anon`, `authenticated` e `service_role`.

Checks: `npx tsc --noEmit`, `npx tsc -p supabase/functions/tsconfig.recovery.json`, `npm run build`, ESLint dos componentes/handlers modificados e `git diff --check`. Todos esses checks passaram no fechamento; o ESLint apresentou somente um aviso de Fast Refresh (exportação de helper junto do componente), sem erros.

**Falhas encontradas e corrigidas durante o trabalho:** teste antigo esperava que salvar andamento também enviasse código de rastreamento — atualizado para a separação exigida; tipos de testes de Edge Functions precisaram da declaração ambiente já usada na verificação do servidor; ajustes de formatação do handler. Essas falhas foram resolvidas antes do fechamento.

**Não executados:** login real de administrador/cliente em produção, leitura de pedidos reais, comparação de saldos com extrato/gateway, envio real pelo Resend, comprovação de entrega, abertura no aplicativo WhatsApp do celular, inspeção visual em navegador/celular e implantação das migrations/Edge Function. O navegador remoto não alcança o servidor local, conforme já observado na entrega anterior. Testes de interface usam DOM local e não substituem inspeção visual. A API de produção indisponível não foi tratada como teste aprovado.

Teste sem cobranças/envios: `npm test` e os checks de tipos/build. No backend de homologação, chamar `tracking-email` com sessão de administrador, `mode: "test"` e ID de pedido de teste já existente: valida/renderiza sem HTTP ao Resend e sem gravar tentativas. O corpo não aceita contato alternativo. Não criar cobranças nem alterar pedidos reais para preparar esse teste. A prévia da mensagem no ADM também é local e não envia nada.

## Arquivos principais

- `supabase/migrations/20261024121752_tracking_and_admin_audit.sql`, `scripts/verify-admin-audit.sql`.
- `supabase/functions/tracking-email/index.ts`, `_shared/tracking-handler.ts`, `_shared/tracking-email.ts`, `_shared/tracking-rules.ts`.
- `supabase/config.toml`, `supabase/functions/tsconfig.recovery.json`.
- `src/components/admin/{OrdersPage,OrderTracking,LowStockSettings,CatalogPage,FinancialDashboard}.tsx`.
- `src/components/CustomerOrders.tsx`, `src/routes/conta.tsx`, `src/lib/{tracking,admin-finance}.ts`, contrato `src/integrations/supabase/types.ts`.
- Testes adicionados/atualizados em `src/test`, incluindo ambiente de tipos de Edge Functions.
- Este relatório. A documentação anterior `docs/admin-management.md` deve ser lida junto das correções descritas aqui.
