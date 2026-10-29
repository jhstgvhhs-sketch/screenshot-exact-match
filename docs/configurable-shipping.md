# Configuração de frete para a 3DFLEX

## O que foi adicionado

O painel /admin?section=shipping-settings tem a seção **Configurar frete**, com os campos:

- **Frete fixo (R$):** usado em pedidos sem impressoras quando a promoção Pix não se aplica. Aceita R$ 0,00 a R$ 5.000,00.
- **Frete grátis no Pix acima do limite:** liga/desliga a promoção.
- **Limite do frete grátis no Pix (R$):** a promoção aplica-se quando o subtotal dos produtos é estritamente maior que o limite configurado.
- **Preparar frete zero para teste:** apenas preenche R$ 0,00 no formulário; nada é salvo até clicar em **Salvar configuração de frete**.
- **Restaurar valores padrão:** preenche R$ 37,80 e frete grátis no Pix acima de R$ 600,00; também exige salvar para aplicar.

Pedidos com qualquer impressora continuam com frete grátis no Pix e no cartão.

## Ativação no backend

1. Revise e aplique supabase/migrations/20261028000001_configurable_shipping.sql no projeto Supabase usado pela loja, depois das migrações anteriores.
2. Publique o frontend atualizado da branch main.
3. Acesse /admin, abra **Logística → Configurar frete** e confirme que os valores atuais carregam.
4. Para testar o cálculo Pix sem frete, clique em **Preparar frete zero para teste** e depois em **Salvar configuração de frete**.
5. Faça apenas um teste controlado, sem repetir cobranças se houver demora. O valor real enviado à Blackcat vem do total calculado pelo servidor.
6. **Depois do teste**, restaure os valores comerciais desejados e salve.

## Atenção

A configuração é compartilhada e afeta os **novos pedidos reais** assim que a migração e a publicação estiverem ativas. R$ 0,00 não é um modo sandbox: ele torna o frete grátis para pedidos sem impressoras, inclusive no cartão. Essa configuração não ativa o secret BLACKCAT_PIX_ENABLED, não troca credenciais e não comprova que o gateway está em sandbox.
