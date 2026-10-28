# Screenshot Exact Match

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/24975983-5cff-4e33-9a92-3b9d6a819986).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Checkout e pagamento

O checkout tem duas etapas: dados de entrega e pagamento.

- **Pix:** o checkout chama a Edge Function `blackcat-create-pix`. A emissão real depende da função estar publicada, das migrações corretas no banco e dos secrets da Blackcat configurados. Mantenha `BLACKCAT_PIX_ENABLED=false` até concluir testes reais controlados.
- **Cartão:** o site registra o pedido como pendente pelo RPC `place_order` e encaminha o cliente ao WhatsApp configurado em `store_settings.whatsapp` (com `VITE_CHECKOUT_WHATSAPP_NUMBER` como alternativa). O pagamento só deve ser marcado como pago após confirmação manual.
- **Frete:** compras com qualquer impressora têm frete grátis no Pix ou cartão. Nos demais pedidos, o frete grátis acima de R$ 600,00 vale exclusivamente para Pix.
- **Parcelamento:** compras com impressora anunciam até 10x sem juros no cartão; os demais produtos estão sujeitos aos juros da maquineta. Confirme as condições finais com o atendimento.

Configure `VITE_CHECKOUT_WHATSAPP_NUMBER` com `55` + DDD + número se a loja ainda não tiver um WhatsApp salvo nas configurações públicas. Nunca configure credenciais Blackcat em variáveis `VITE_*`.

## Blackcat Pix — configuração no servidor

A integração usa a documentação https://docs.blackcatoficial.com/ e as funções
`blackcat-create-pix` e `blackcat-webhook`. A cobrança envia CPF como
`customer.document = { number, type: 'cpf' }`, endereço com `shipping.number`
e uma linha de frete de 3780 centavos. Valores são calculados a partir do pedido
salvo no banco, nunca dos preços enviados pelo navegador. São aceitas de 1 a 10
unidades por variante.

Configure apenas em **Edge Function Secrets**, nunca no GitHub, no formulário
administrativo ou em variáveis `VITE_*`:

- `BLACKCAT_API_KEY`: chave secreta da conta aprovada.
- `BLACKCAT_WEBHOOK_URL`: URL HTTPS pública de `blackcat-webhook`.
- `BLACKCAT_PIX_ENABLED`: mantenha `false` até validar o fluxo completo.

O webhook consulta a API autenticada da Blackcat para verificar transação e valor;
não confia apenas no status recebido no POST. Antes da ativação, confirme as
migrações do banco, a política de reserva/liberação de estoque vigente e o
tratamento de retentativas de criação de cobrança (inclusive timeout e falha ao
salvar o identificador no banco). Um erro depois da criação de pedido requer
conciliação antes de repetir a tentativa. A publicação do código não configura
secrets, não aplica migrações e não publica as Edge Functions automaticamente.
