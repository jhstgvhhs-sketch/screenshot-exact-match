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
      <p className="mt-4 text-muted-foreground">Conteúdo a ser preenchido pela 3DFLEX.</p>
    </section>
  );
}
