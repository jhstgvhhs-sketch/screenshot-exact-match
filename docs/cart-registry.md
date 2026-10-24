# Registro de carrinhos e consulta administrativa

Esta etapa elimina a dependência da Edge Function `recovery-carts` para capturar carrinhos e consultar a seção administrativa de carrinhos. A migração `20261024174213_cart_registry_rpc.sql` adiciona duas RPCs e reutiliza as tabelas e funções existentes. Não habilita envios, não altera pagamentos/pedidos nem estoque.

- `registry_sync_cart`: endpoint público de escrita com capacidade aleatória de 256 bits. Persiste somente o hash; não permite consultar dados pessoais. Preços, nomes e cores são reconstruídos no servidor a partir das variantes atuais. Quantidades, formato, contatos e consentimentos são validados. Identidade do proprietário vem de `auth.uid()`. A função interna de sincronização continua sem concessão pública.
- `admin_cart_registry`: exige sessão e função administrativa no servidor, além das políticas RLS existentes. O acesso anônimo foi explicitamente revogado, inclusive diante dos privilégios padrão do ambiente. Filtra e pagina no banco, 25 registros por página. Retorna apenas campos necessários, sem hash de sessão.

A seção ADM → Carrinhos abandonados agora usa `CartRegistry`, com lista, indicadores, filtros e detalhes. O relógio do banco determina abandono após 30 minutos: a classificação não depende de o administrador manter o navegador aberto. Pagamentos pendentes aparecem separados; pagamentos confirmados são reconhecidos pela conciliação existente. O indicador de pagamento confirmado informa compras confirmadas associadas a carrinhos, sem atribuir essas vendas a uma campanha de recuperação.

O carrinho mantém o debounce existente; falhas de registro não impedem compra. No checkout, captura apenas nome/e-mail/telefone progressivamente e consentimentos separados. CPF, endereço e dados de pagamento não são enviados. Contatos não são persistidos no localStorage. Abertura de páginas administrativas/de conta não renova a atividade do carrinho. Carrinhos vazios não são listados.

As ações de links, automações, provedores, histórico de envios e tarefas periódicas/retencão continuam na etapa anterior preparada com Edge Functions; esta mudança não declara essas integrações como publicadas. A rotina de retenção agendada ainda precisa ser concluída separadamente. Nenhum envio foi habilitado.

## Testar sem pedidos ou cobranças

Após publicar a interface, adicione um produto ao carrinho da vitrine. Consulte o ADM: a sessão aparece em andamento. Preencha nome/e-mail/telefone no checkout para conferir a captura, sem gerar Pix nem registrar pedido. Encerre a atividade da vitrine e, após 30 minutos, atualize o ADM para ver o status calculado pelo servidor. Não é possível reconstruir sessões antigas que nunca chegaram ao banco.

Validação executada em PostgreSQL isolado: sessão anônima, preços não manipuláveis, deduplicação por sessão, captura limitada de contatos, consentimento explícito, nenhuma fila criada, estoque preservado, bloqueio de usuários comuns, proteção de sessão de outro proprietário, abandono por tempo e diferenciação de pagamentos pendentes/confirmados. Testes de UI cobrem consulta, detalhes, filtros, vazio e erro com retry. No backend real, funções/RLS foram verificadas e a API pública rejeitou token inválido e consulta administrativa anônima. Não foi simulada sessão administrativa de produção nem criada sessão fictícia de cliente no banco real.
