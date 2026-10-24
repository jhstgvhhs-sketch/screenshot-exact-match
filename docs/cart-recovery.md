# Recuperação de carrinhos da 3DFLEX

## Implantação por etapas

1. Aplicar `supabase/migrations/20261024015332_abandoned_carts_recovery.sql` **no backend atual da loja**, conferindo antes o projeto indicado em `supabase/config.toml`. Não aplicar em outro projeto Supabase conectado por engano.
2. Publicar `recovery-carts`, `recovery-worker` e `recovery-provider-webhook` com os módulos `_shared/recovery-*` e a configuração específica de cada função. O JWT automático é desligado para permitir visitantes e callbacks; os handlers validam tokens de capacidade, JWT administrativo, segredo do cron ou assinatura do provedor, conforme a operação. Não remover essas validações.
3. Manter `recovery_settings.config.enabled=false`, `dry_run=true`, canais desativados e `RECOVERY_LIVE_ENABLED=false`. Isso não altera a integração Blackcat.
4. Aplicar `scripts/recovery-schedule.sql`. O primeiro cron apenas identifica abandono, concilia pagamentos e executa retenção, a cada 5 minutos. Conferir `recovery_scheduler_status()`; não presumir instalação se a extensão ou permissões não estiverem disponíveis.
5. Configurar os Secrets abaixo no servidor, nunca no navegador, banco público, GitHub ou chat. O painel mostra somente presença de configuração, não valores.

| Secret | Uso |
| --- | --- |
| `RECOVERY_PUBLIC_ORIGIN` | Origem HTTPS real da loja, sem barra final, caminho ou parâmetros |
| `RECOVERY_LINK_SECRET` | Pelo menos 32 caracteres aleatórios para capacidades de recuperação/descadastro por job |
| `RECOVERY_CRON_SECRET` | Segredo aleatório exclusivo do worker |
| `RECOVERY_LIVE_ENABLED` | `false` inicialmente; trava adicional para qualquer envio real |
| `WHATSAPP_ACCESS_TOKEN` | Token da plataforma oficial Meta |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID` | IDs reais do número e conta empresarial |
| `WHATSAPP_GRAPH_VERSION` | Versão da Graph API suportada pela conta, no formato `vNN.N` |
| `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | Verificação de assinatura e inscrição do webhook |
| `RESEND_API_KEY` | API de e-mail Resend |
| `RECOVERY_EMAIL_FROM` | Endereço remetente autorizado e verificado; precisa coincidir com o Adm |
| `RESEND_WEBHOOK_SECRET` | Segredo `whsec_...` da assinatura do webhook Resend |

6. Para o cron de mensagens, provisionar privadamente no Vault `recovery_backend_url` (URL do backend) e `recovery_cron_secret` (mesmo valor do Secret do worker). Reaplicar o script de agendamento. O dispatch executa a cada minuto, com até três jobs por lote e timeout de 10 segundos por chamada ao provedor. Ele só instala `3dflex-recovery-dispatch` quando ambos existem. Não incluir valores secretos em migrações ou comandos registrados no repositório.
7. Conferir no Adm os dois agendamentos, credenciais, remetente e os modelos aprovados. A infraestrutura de mensagens não depende do navegador do administrador.

Não é necessário redeploy das funções Blackcat. O observador de `orders` é adicionado por trigger independente, com contenção de falhas para não reverter atualizações de pagamento. As funções de pagamento, de estoque e `place_order` permanecem intactas.

## WhatsApp e e-mail

WhatsApp usa exclusivamente a Graph API oficial e modelos aprovados. Cada modelo suportado deve ter um corpo com exatamente três parâmetros (`{{1}}`: primeiro nome, `{{2}}`: link de recuperação, `{{3}}`: link de descadastro) e, opcionalmente, um rodapé. Cabeçalhos, botões e parâmetros adicionais são bloqueados neste adaptador. Aprovar na Meta os textos escolhidos antes de informar nome/idioma no Adm. Editar o texto no painel altera o e-mail e serve de referência para o modelo; não altera automaticamente o modelo aprovado pela Meta. O worker consulta a aprovação antes de enviar.

Resend: verificar o domínio e configurar remetente real. A chave precisa permitir consultar o domínio e enviar por ele. O worker verifica domínio e correspondência do remetente; um e-mail aceito pelo provedor não é chamado de entregue até o callback. Descadastro aparece em todas as mensagens. Webhooks de bounce/reclamação bloqueiam novos envios para o canal.

Callbacks:

- Meta: `/functions/v1/recovery-provider-webhook?provider=whatsapp`, incluindo verificação inicial e assinatura `X-Hub-Signature-256` do corpo original. Inscrever eventos de mensagens e status. Respostas SAIR/PARAR/CANCELAR/STOP/DESCADASTRAR revogam o canal.
- Resend: `/functions/v1/recovery-provider-webhook?provider=email`, eventos `email.delivered`, `email.bounced`, `email.complained`, `email.failed`, com validação Svix e limite de 5 minutos para timestamp.

## Prazos e funcionamento

- Abandono: 30 minutos desde a última atividade real rastreada (itens, contato, interação na loja). Não há heartbeat que mantenha um carrinho ativo apenas porque uma aba está aberta. Uma conexão offline pode atrasar a sincronização; o carrinho local continua funcionando.
- Etapas padrão: 30, 1440 e 4320 minutos **após o abandono**. A primeira vence após 60 minutos de inatividade, conforme o requisito de 30 minutos após o abandono.
- Janela padrão: 09h–20h `America/Bahia`, configurável entre 08h e 22h. Mensagens vencidas fora da janela aguardam a próxima janela, sem enviar de madrugada.
- A fila é individual por carrinho/canal/etapa/modo. Atividade adia jobs ainda pendentes; etapas já aceitas nunca são repetidas. O máximo é três lembretes por canal para esse carrinho.
- Com a regra padrão, um Pix pendente bloqueia lembretes até ser confirmado/encerrado no sistema de pedidos. Não consultamos nem criamos novas cobranças no worker.
- Abrir o link não marca pagamento como aprovado. Restaurar itens inicia uma nova sessão e interrompe a sequência anterior. Receita de recuperação só é contabilizada com pagamento confirmado no pedido correspondente. Não contamos duas vezes o carrinho original e a sessão restaurada.
- A correlação exige usuário e conjunto exato de variantes/quantidades no pedido, criado após o carrinho. Recuperação por outra conta/itens diferentes não é atribuída automaticamente por aproximação de e-mail ou telefone.
- Links duram no máximo o prazo do carrinho (7 dias) e só devolvem catálogo atual e quantidades, nunca contatos ou dados de entrega. Os tokens ficam no fragmento da URL e são removidos do endereço após leitura. O banco guarda apenas o hash.
- O estoque não é reservado por esse sistema. A política atual de encomenda/limite por cor é preservada. Itens inativos são removidos, preços/estoque são revistos ao restaurar e antes de registrar pagamento; se o preço mudar, o cliente precisa conferir o novo resumo. Frete é calculado pela regra atual do checkout. Nenhum desconto antigo é reaplicado pelo link.

## Segurança e limites operacionais

Contatos e itens ficam em tabelas com RLS; somente administradores autorizados leem o painel. RPCs privilegiadas são restritas ao `service_role`; visitantes usam token aleatório de 256 bits e não conseguem consultar dados pessoais. Troca de contato invalida o consentimento anterior. Somente uma ação explícita no checkbox pode autorizar novamente o canal; sincronização passiva não o faz.

Há limite de requisições por origem observada no gateway, por minuto, com apenas o hash do IP e retenção curta. Configure também limites de tráfego na infraestrutura conforme o volume; isso não substitui proteção contra abuso distribuído.

Logs registram códigos de resultado e HTTP, sem payload, nomes, destinatários ou texto das mensagens. Carrinhos e dados de recuperação são excluídos após a retenção configurada (7–30 dias desde a última atividade), sem excluir pedidos. Hashes de bloqueio de contato permanecem por até 180 dias para respeitar descadastros. Os indicadores refletem a janela de retenção, não um relatório contábil permanente.

O worker reivindica jobs atomicamente e revalida pagamento, consentimento e configuração imediatamente antes da chamada ao provedor. Revogações/pagamentos cancelam jobs pendentes/reivindicados. Uma mensagem já aceita ou em trânsito no provedor não pode ser recolhida; existe uma pequena janela inevitável entre a última verificação e a aceitação externa.

WA não fornece aqui uma chave de idempotência equivalente à de e-mail. Por isso timeout/5xx/lease expirada são marcados **incertos**, sem reenvio automático. Exigem conciliação manual com o provedor. E-mail usa `Idempotency-Key` estável por job. Só há retry automático para rejeição explícita de rate limit (429), com backoff e máximo de 3 tentativas. Repetir falhas explícitas pelo Adm respeita o limite; resultados incertos não têm botão de reenvio.

## Testar sem mensagens nem cobranças

1. `npm test`: testes de banco usam PostgreSQL local em memória via PGlite, sem conexão de produção. Dados `example.test` e números locais dos fixtures nunca são enviados para serviços reais.
2. `npx tsc --noEmit`; `npx tsc -p supabase/functions/tsconfig.recovery.json`; `npm run build`.
3. Em ambiente de teste, adicionar itens, preencher só os contatos de quem participa do teste e conferir os consentimentos desmarcados. Alterar um contato deve revogar o canal anterior. Não clicar em gerar Pix nem registrar um pedido para testar apenas a captura.
4. Usar a migração/cron em staging ou aguardar os prazos reais. Não alterar datas de clientes reais para forçar testes.
5. No Adm, habilitar a sequência em **modo de testes**, escolher canais e salvar. “Simular etapas vencidas” usa somente carrinhos elegíveis/consentidos existentes, grava `simulated` e nunca chama provedores nem APIs de pagamento. Se não houver etapas vencidas, retorna zero; não inventa contatos.
6. Testar recuperação pelo link, conferir preço/variante/frete e parar antes de gerar pagamento. Testar descadastro com consentimento do participante. Confirmação automática com dinheiro só pode ser validada por uma compra real autorizada ou ambiente sandbox do gateway; os testes locais verificam a interrupção sem cobrar.

## Ativação real

Conectar provedores, verificar domínio/remetente e aprovação dos três modelos Meta, instalar os dois crons, revisar janela e consentimentos, validar webhooks assinados e os bloqueios de pagamento/descadastro em staging. Só então liberar `RECOVERY_LIVE_ENABLED=true` no servidor e retirar o modo de testes no Adm, nos canais desejados. Não habilitar automaticamente durante a implantação. A presença de uma chave no painel não comprova que a integração externa foi aprovada.

## Referências dos adaptadores

- Supabase: https://supabase.com/docs/guides/functions/schedule-functions
- Meta (modelos oficiais): https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/template/
- Resend: https://resend.com/docs/api-reference/emails/send-email e https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests

## Arquivos desta implementação

- `bun.lock`
- `docs/cart-recovery.md`
- `package.json`
- `scripts/recovery-schedule.sql`
- `src/components/PixPaymentStatus.tsx`
- `src/components/RecoveryConsent.tsx`
- `src/components/site/AbandonedCarts.tsx`
- `src/lib/cart-recovery.ts`
- `src/lib/cart.tsx`
- `src/lib/checkout-review.ts`
- `src/routeTree.gen.ts`
- `src/routes/admin.tsx`
- `src/routes/checkout.tsx`
- `src/routes/descadastrar.tsx`
- `src/routes/info.$slug.tsx`
- `src/routes/recuperar.tsx`
- `src/test/abandoned-carts-admin.test.tsx`
- `src/test/checkout-review.test.ts`
- `src/test/recovery-database.test.ts`
- `src/test/recovery-rules.test.ts`
- `src/test/recovery-tracking.test.tsx`
- `src/test/setup.ts`
- `supabase/config.toml`
- `supabase/functions/_shared/recovery-providers.ts`
- `supabase/functions/_shared/recovery-rules.ts`
- `supabase/functions/_shared/recovery-server.ts`
- `supabase/functions/_shared/recovery-webhook-signatures.ts`
- `supabase/functions/recovery-carts/index.ts`
- `supabase/functions/recovery-edge.d.ts`
- `supabase/functions/recovery-provider-webhook/index.ts`
- `supabase/functions/recovery-worker/index.ts`
- `supabase/functions/tsconfig.recovery.json`
- `supabase/migrations/20261024015332_abandoned_carts_recovery.sql`
