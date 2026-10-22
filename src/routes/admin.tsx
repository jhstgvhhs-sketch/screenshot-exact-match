import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel — 3DFLEX" },
      { name: "description", content: "Painel administrativo 3DFLEX." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Painel — 3DFLEX" },
      { property: "og:description", content: "Painel administrativo 3DFLEX." },
    ],
  }),
  component: () => (
    <section className="container-x py-10">
      <h1 className="text-3xl font-bold">Painel administrativo</h1>
      <p className="mt-4 text-muted-foreground">Painel em construção.</p>
    </section>
  ),
});
