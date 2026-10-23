import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/site/ProductCard";
import { productsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/produtos")({
  validateSearch: (s: Record<string, unknown>): { q?: string; categoria?: string } => ({
    q: typeof s.q === "string" ? s.q : undefined,
    categoria: typeof s.categoria === "string" ? s.categoria : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Produtos — 3DFLEX" },
      { name: "description", content: "Catálogo de filamentos PLA, PETG e acessórios para impressão 3D." },
      { property: "og:title", content: "Produtos — 3DFLEX" },
      { property: "og:description", content: "Catálogo de filamentos e acessórios 3D." },
    ],
  }),
  component: Produtos,
});

function Produtos() {
  const { q, categoria } = Route.useSearch();
  const { data = [], isLoading } = useQuery(productsQuery());
  const list = data.filter(
    (p) =>
      (!categoria || p.categories?.slug?.toLowerCase() === categoria.toLowerCase() ||
        (categoria.toLowerCase() === "petg" && /petg/i.test(`${p.material ?? ""} ${p.name}`)) ||
        (categoria.toLowerCase() === "pla" && /\\bpla\\b/i.test(`${p.material ?? ""} ${p.name}`)) ||
        (categoria.toLowerCase() === "acessorios" && /acess[oó]rio/i.test(`${p.categories?.name ?? ""} ${p.name}`))) &&
      (!q || `${p.name} ${p.brand} ${p.product_variants.map((v) => v.color).join(" ")}`.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <section className="container-x py-10">
      <h1 className="text-3xl font-bold">{categoria ? categoria.toUpperCase() : "Todos os produtos"}</h1>
      {q && <p className="mt-1 text-muted-foreground">Busca: “{q}”</p>}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {list.flatMap(p => p.product_variants.length ? p.product_variants.filter(v => !q || `${p.name} ${p.brand} ${v.color}`.toLowerCase().includes(q.toLowerCase())).map(v => <ProductCard key={v.id} p={p} variant={v} />) : [<ProductCard key={p.id} p={p} />])}
      </div>
      {!isLoading && list.length === 0 && <p className="mt-6 text-muted-foreground">Nenhum produto encontrado.</p>}
    </section>
  );
}
