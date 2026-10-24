# Correções de disponibilidade do ADM — 3DFLEX

## O que foi identificado

- O merge automático `0c39cc1` trouxe o snapshot antigo de uma tarefa de geração de tipos, removendo os arquivos administrativos de `b72f29d`. A mudança de trabalho em `b418e70` era somente no arquivo de tipos gerados.
- As tabelas `purchase_notification_settings` e `payment_gateway_settings` não existiam no backend da loja.
- As tabelas da recuperação já estavam instaladas, mas os endpoints `recovery-carts`, `recovery-worker`, `recovery-provider-webhook` e `recent-purchases` retornavam HTTP 404 / NOT_FOUND.

## Correções no código

- Recuperados os arquivos do painel profissional e da auditoria a partir de `b72f29d`, preservando integralmente o arquivo de tipos gerado mais recentemente. Nenhum histórico Git foi reescrito.
- Configuração de gateway passa a mostrar erro e opção de tentar novamente em vez de assumir `none`/sandbox/Pix desligado quando uma linha não está disponível.
- A tela não afirma mais que uma cobrança ativa está indisponível. Explica que as preferências são separadas das credenciais e da liberação da Blackcat no servidor. Nenhuma alteração é salva ao abrir a página; o salvamento exige confirmação, valida a resposta do banco e libera os controles após erro.
- O feed preparado de compras reais passou a usar `paid_at`, aceitar `paid` e `pago`, excluir ambas as grafias de cancelamento e limitar a três confirmações das últimas 24 horas. Pedidos antigos sem data não recebem uma data inventada. O horário no aviso identifica confirmação do pagamento. Nenhum nome, endereço, valor ou ID de pedido sai no feed.

## O que foi aplicado no banco

`scripts/install-admin-runtime-settings.sql` foi executado com sucesso, em transação, no projeto Lovable existente. Ele cria somente as tabelas de preferências ausentes, grants e políticas necessárias. Não altera pedidos, estoque, catálogo, preços, funções Blackcat, segredos ou liberação de cobranças.

A preferência inicial deste projeto foi registrada como Blackcat / produção / Pix solicitado, porque a loja já utiliza essa integração. Isso é metadado do ADM: o handler de cobrança continua controlado pelos mesmos Secrets anteriores. O script não substitui uma configuração existente e foi testado quanto à repetição.

Validação realizada pela API real:

- Leitura anônima das preferências públicas de notificações: HTTP 200, linha `main` presente.
- Leitura anônima da configuração privada de gateway: HTTP 401 / 42501.

A consulta adicional de conferência pelo conector Lovable foi bloqueada pelo limite gratuito temporário de ações de banco, após o script ter sido executado. Não foi repetida por outro caminho privilegiado. Nenhuma sessão administrativa simulada foi usada. O teste do formulário com o login real permanece pendente; o bloqueio anônimo não substitui esse teste.

## Recuperação e avisos: publicação ainda pendente

As três funções da recuperação e o feed `recent-purchases` ainda precisam ser publicados. Criar as tabelas de preferências não publica Edge Functions.

A configuração de recuperação foi conferida antes do bloqueio: automação desligada, modo de testes ligado e canais WhatsApp/e-mail desligados. Os registros de agendamento ainda indicam ausência do sweep e do dispatch. Não foram criados carrinhos, contatos, jobs, mensagens ou cobranças de teste.

A ferramenta Lovable conectada permite SQL direto, mas não oferece uma operação específica de deploy de Edge Functions. O caminho disponível para publicá-las é solicitar a implantação ao agente Lovable, que utiliza créditos. Como o usuário pediu execução sem créditos, essa chamada não foi realizada. É necessária autorização para utilizar os créditos existentes nessa publicação; não está autorizada compra de créditos ou contratação de plano.

Publicação preparada, quando autorizada:

1. Usar o código mais recente da main, sem editar arquivos no Lovable nem restaurar snapshots antigos.
2. Publicar exclusivamente `recovery-carts`, `recovery-worker`, `recovery-provider-webhook` e `recent-purchases`, com os módulos `_shared` correspondentes e configuração `supabase/config.toml`.
3. Não modificar as funções Blackcat, não mudar Secrets, não habilitar canais/envios reais e não gerar dados ou pedidos de teste.
4. Conferir por GET/OPTIONS que os endpoints existem e respeitam método/autorização. O feed público permite apenas a leitura de horários reais de confirmações.
5. A instalação do agendamento de abandono continua uma etapa distinta, dependente do mecanismo de agendamento permitido no backend. Não marcar `recovery_runtime` como instalado sem confirmação do agendamento real.

Credenciais de mensageria, links e liberação de envios reais continuam seguindo `docs/cart-recovery.md`. A publicação de funções não equivale à ativação do remarketing.

## Validação local

157 testes aprovados: incluem a suíte existente e testes novos de criação/repetição das tabelas, autorização administrativa, isolamento do gateway, carregamento/salvamento sem alterar credenciais, e feed restrito a confirmações reais e timestamps confiáveis.

Verificações de tipos da aplicação e das Edge Functions, compilação e lint dos componentes/handlers alterados foram executados. Não houve inspeção visual em navegador real, autenticação de administrador em produção, envio de mensagens ou geração de cobranças.
