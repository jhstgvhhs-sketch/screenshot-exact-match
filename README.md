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

## Checkout preparado

O carrinho encaminha para `/checkout`, com dados de contato, entrega e resumo.
O frete fixo de R$ 37,80 é compartilhado entre produto, carrinho e checkout.
Pix Blackcat permanece desativado: não há cobrança, QR Code ou criação de pedido.

Para habilitar o encaminhamento de cartão ao atendimento, configure
`VITE_CHECKOUT_WHATSAPP_NUMBER` com `55` + DDD + número e gere uma nova build.
A configuração vazia ou inválida mantém o atendimento indisponível. O cliente
confere o formulário e clica em **Continuar no WhatsApp** para enviar o resumo;
o carrinho é preservado e nenhum pagamento ou pedido é confirmado pelo site.
Nunca configure credenciais Blackcat em variáveis `VITE_*`.
