import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/conta")({
  validateSearch: (s: Record<string, unknown>): { aba?: string } => ({ aba: typeof s.aba === "string" ? s.aba : undefined }),
  head: () => ({
    meta: [
      { title: "Minha conta — 3DFLEX" },
      { name: "description", content: "Área do cliente 3DFLEX." },
      { property: "og:title", content: "Minha conta — 3DFLEX" },
      { property: "og:description", content: "Área do cliente 3DFLEX." },
    ],
  }),
  component: () => (
    <section className="container-x py-10">
      <h1 className="text-3xl font-bold">Minha conta</h1>
      <p className="mt-4 text-muted-foreground">Área do cliente em construção.</p>
    </section>
  ),
});
