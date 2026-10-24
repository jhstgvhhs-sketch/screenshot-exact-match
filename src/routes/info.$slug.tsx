import { createFileRoute } from "@tanstack/react-router";

const titles: Record<string, string> = {
  sobre: "Sobre nós", contato: "Contato", privacidade: "Política de privacidade",
  trocas: "Trocas e devoluções", envio: "Política de envio", termos: "Termos de uso",
};

export const Route = createFileRoute("/info/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${titles[params.slug] ?? "Informações"} — 3DFLEX` },
      { name: "description", content: `${titles[params.slug] ?? "Informações"} da loja 3DFLEX.` },
      { property: "og:title", content: `${titles[params.slug] ?? "Informações"} — 3DFLEX` },
      { property: "og:description", content: "Informações da loja 3DFLEX." },
    ],
  }),
  component: Info,
});

function Info() {
  const { slug } = Route.useParams();
  return (
    <section className="container-x max-w-3xl py-10">
      <h1 className="text-3xl font-bold">{titles[slug] ?? "Informações"}</h1>
      {slug === "privacidade" ? <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
        <h2 className="text-lg font-bold text-foreground">Carrinhos e recuperação de compras</h2>
        <p>O carrinho usa armazenamento local no seu navegador. Para permitir a retomada da compra, registramos também um identificador aleatório, produtos, cores, quantidades, valor estimado e última atividade. Ao informar seus contatos no checkout, podemos salvar nome, e-mail e telefone. CPF, endereço e dados de pagamento não são copiados para o sistema de recuperação.</p>
        <p>Os lembretes de carrinho por e-mail e WhatsApp dependem das autorizações separadas e opcionais apresentadas no checkout. Registramos canal, data e finalidade da autorização. Você pode comprar sem autorizar e cancelar a qualquer momento pelo link nas mensagens. No WhatsApp, também pode responder SAIR.</p>
        <p>Quando o envio estiver ativo e autorizado, os contatos necessários serão utilizados pelos provedores de e-mail e pela plataforma oficial do WhatsApp para entregar os lembretes. Não enviamos a eles CPF, dados de cartão ou credenciais de pagamento.</p>
        <p>Links de recuperação contêm um token aleatório e permitem consultar os produtos, não seus dados pessoais. Não compartilhe esses links. Carrinhos de recuperação expiram em 7 dias; os dados de recuperação e seu histórico são excluídos conforme a retenção configurada, de até 30 dias desde a última atividade. O resumo criptográfico do contato usado para bloquear novos lembretes pode permanecer por até 180 dias para respeitar o descadastro.</p>
        <p>Pedidos e comprovantes financeiros são mantidos separadamente: cancelar lembretes ou excluir o carrinho não cancela uma compra. Apenas administradores autorizados podem acessar os contatos e o histórico de recuperação.</p>
        <p>Para solicitar acesso, correção ou exclusão de seus dados, fale com a 3DFLEX pelo canal de atendimento informado no rodapé. Essa solicitação será analisada considerando os registros necessários à compra já realizada.</p>
      </div> : <p className="mt-4 text-muted-foreground">Conteúdo a ser preenchido pela 3DFLEX.</p>}
    </section>
  );
}
