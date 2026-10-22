import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Truck, ShieldCheck, CreditCard, MapPin, ArrowRight } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/site/ProductCard";
import { productsQuery, categoriesQuery } from "@/lib/catalog";
import { brl, SHIPPING_FLAT } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "3DFLEX — Sua próxima criação começa aqui" },
      { name: "description", content: "Filamentos PLA, PETG e acessórios para transformar suas ideias em realidade. Envio para todo o Brasil." },
      { property: "og:title", content: "3DFLEX — Sua próxima criação começa aqui" },
      { property: "og:description", content: "Filamentos PLA, PETG e acessórios para impressão 3D." },
    ],
  }),
  component: Index,
});



const tips = [
  ["Guarde o filamento seco", "Filamentos absorvem umidade do ar. Use embalagens a vácuo com sílica em gel entre impressões."],
  ["Nivele a mesa", "Uma primeira camada bem aderida evita a maior parte das falhas de impressão."],
  ["Ajuste a temperatura", "Siga a faixa indicada pelo fabricante do filamento e faça uma torre de temperatura para calibrar."],
];

function Index() {
  const { data: products = [] } = useQuery(productsQuery());
  const { data: categories = [] } = useQuery(categoriesQuery());
  const featured = products.filter((p) => p.featured);

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <img src={hero} alt="Carretéis de filamento 3D e bico de impressora extrudando filamento laranja" width={1600} height={1008} className="absolute inset-0 size-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="container-x relative py-24 md:py-36">
          <div className="max-w-xl animate-rise">
            <p className="mb-4 text-xs font-bold tracking-[0.3em] text-primary">IMPRESSÃO 3D</p>
            <h1 className="text-4xl font-extrabold leading-[1.05] md:text-6xl">SUA PRÓXIMA CRIAÇÃO COMEÇA AQUI.</h1>
            <p className="mt-5 text-lg text-muted-foreground">Filamentos PLA, PETG e acessórios para transformar suas ideias em realidade.</p>
            <Button asChild variant="buy" size="xl" className="mt-8">
              <Link to="/produtos">Explorar produtos <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-x mt-16">
        <h2 className="text-2xl font-bold md:text-3xl">Categorias em destaque</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {categories.map((c) => (
            <Link key={c.slug} to="/produtos" search={{ categoria: c.slug }} className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/60">
              <div className="absolute inset-0 bg-gradient-hero opacity-0 transition-opacity group-hover:opacity-100" />
              <p className="relative font-display text-3xl font-extrabold">{c.name}</p>
              <p className="relative mt-1 text-sm text-muted-foreground">{c.description ?? "Confira os produtos desta categoria."}</p>
              <ArrowRight className="relative mt-6 text-primary transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x mt-16">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold md:text-3xl">Destaques</h2>
          <Link to="/produtos" className="text-sm font-semibold text-primary">Ver tudo</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {(featured.length ? featured : products).slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="container-x mt-16">
        <h2 className="text-2xl font-bold md:text-3xl">Lançamentos</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        {products.length <= 1 && <p className="mt-4 text-sm text-muted-foreground">Novos produtos chegando em breve.</p>}
      </section>

      <section className="container-x mt-16 grid gap-4 md:grid-cols-4">
        {[
          [Truck, "Envio para todo o Brasil", `Frete fixo de ${brl(SHIPPING_FLAT)} · grátis acima de R$ 600 no Pix`],
          [MapPin, "Endereço pelo CEP", "Digite o CEP e preenchemos o endereço"],
          [CreditCard, "Formas de pagamento", "Pix em breve · cartão via WhatsApp"],
          [ShieldCheck, "Dados protegidos", "Não armazenamos dados de cartão"],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Truck;
          return (
            <div key={t as string} className="rounded-xl border border-border bg-card p-5">
              <I className="text-primary" />
              <p className="mt-3 font-semibold">{t as string}</p>
              <p className="text-sm text-muted-foreground">{d as string}</p>
            </div>
          );
        })}
      </section>

      <section className="container-x mt-16">
        <h2 className="text-2xl font-bold md:text-3xl">Dicas de impressão 3D</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {tips.map(([t, d], i) => (
            <article key={t} className="rounded-xl border border-border bg-card p-6">
              <span className="font-display text-4xl font-extrabold text-primary/40">0{i + 1}</span>
              <h3 className="mt-2 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
