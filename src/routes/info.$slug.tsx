import { publicPageHead } from "@/lib/seo";
import { StoreInformation } from "@/components/site/StoreInformation";
import { createFileRoute, notFound } from "@tanstack/react-router";

const titles: Record<string, string> = {
  sobre: "Sobre nós", contato: "Contato", privacidade: "Política de privacidade",
  trocas: "Trocas e devoluções", envio: "Política de envio", termos: "Termos de uso",
};

export const Route = createFileRoute("/info/$slug")({
  beforeLoad: ({ params }) => { if (!titles[params.slug]) throw notFound(); },
  head: ({ params }) => {
    const descriptions: Record<string,string> = { sobre: "Conheça a 3DFLEX e nossa loja de filamentos e acessórios para impressão 3D.", contato: "Fale com o atendimento da 3DFLEX para tirar dúvidas sobre produtos e pedidos.", privacidade: "Saiba como a 3DFLEX utiliza dados de carrinhos e autorizações de comunicação.", trocas: "Informações de atendimento sobre trocas e devoluções na 3DFLEX.", envio: "Confira as condições de frete da 3DFLEX e como solicitar nota fiscal e rastreamento.", termos: "Informações e condições de atendimento da loja 3DFLEX." };
    const head = publicPageHead(`/info/${params.slug}`, `${titles[params.slug] ?? "Página não encontrada"} | 3DFLEX`, descriptions[params.slug] ?? "Confira as informações da loja 3DFLEX.");
    return { ...head, meta: [...head.meta] };
  },
  component: Info,
});

function Info() {
  const { slug } = Route.useParams();
  return (
    <section className="container-x max-w-3xl py-10">
      <h1 className="text-3xl font-bold">{titles[slug] ?? "Informações"}</h1>
      <StoreInformation section={slug} />
    </section>
  );
}
