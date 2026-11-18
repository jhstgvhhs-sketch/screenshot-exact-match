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

## Supabase e checkout

O frontend utiliza o projeto Supabase **333**:
`zbinwdhzquhvhbhyeqml`. O endereço e a chave publishable desse projeto são usados
pelo cliente web; a chave publishable é pública e não substitui credenciais de servidor.

O checkout tem duas etapas: dados de entrega e pagamento.

- **Pix:** o checkout chama a Edge Function `bluepag-create-pix`. A cobrança é criada pela BluePag API v1 em BRL, com OAuth2 Client Credentials e Bearer JWT.
- **Webhook:** `bluepag-webhook` valida HMAC-SHA256 pelo cabeçalho `X-Webhook-Signature` e consulta o pagamento na BluePag antes de liquidar o pedido.
- **Cartão:** o site registra o pedido como pendente pelo RPC `place_order` e encaminha o cliente ao WhatsApp configurado em `store_settings.whatsapp`. O pagamento só deve ser marcado como pago após confirmação manual.
- **Frete:** compras com qualquer impressora têm frete grátis no Pix ou cartão. Nos demais pedidos, o frete grátis acima de R$ 600,00 vale exclusivamente para Pix.
- **Parcelamento:** compras com impressora anunciam até 10x sem juros no cartão; os demais produtos estão sujeitos aos juros da maquineta. Confirme as condições finais com o atendimento.

Configure `VITE_CHECKOUT_WHATSAPP_NUMBER` com `55` + DDD + número se a loja ainda não tiver um WhatsApp salvo nas configurações públicas.

## BluePag PIX — configuração no servidor

Configure somente em **Supabase Edge Function Secrets**; nunca no GitHub ou em variáveis `VITE_*`:

- `BLUEPAG_CLIENT_ID`
- `BLUEPAG_CLIENT_SECRET`
- `BLUEPAG_PIX_ENABLED`
- `BLUEPAG_PIX_TEST_MODE`
- `BLUEPAG_PIX_ALLOWED_EMAILS` (lista separada por vírgulas durante a validação)

O modo de teste permanece restrito por padrão. Defina `BLUEPAG_PIX_TEST_MODE=false`
somente depois de validar uma transação real e o webhook. Mantenha `BLUEPAG_PIX_ENABLED=false`
até as credenciais, URL de postback e reconciliação serem verificadas.

A função de criação calcula o valor a partir do pedido persistido no banco, não dos
preços informados pelo navegador. Em timeout ou resposta ambígua do gateway, o pedido
fica pendente para conciliação e o cliente não deve gerar outro PIX. Saques/cashout
não fazem parte do checkout da loja.
