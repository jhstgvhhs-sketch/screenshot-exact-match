import { publicPageHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Truck, ShieldCheck, CreditCard, MapPin, ArrowRight } from "lucide-react";
import { HomeImages, HomeHeroText } from "@/components/site/HomeImages";
import { StoreBenefits } from "@/components/site/StoreBenefits";
import { SiteReviews } from "@/components/site/SiteReviews";
import hero from "@/assets/hero.jpg";
import { ProductCard } from "@/components/site/ProductCard";
import { productsQuery, categoriesQuery } from "@/lib/catalog";
import { brl, SHIPPING_FLAT } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => publicPageHead("/", "3DFLEX | Filamentos PLA e PETG para Impressão 3D", "Filamentos PLA, PETG e acessórios para transformar suas ideias em realidade. Confira as cores e compre na 3DFLEX. Envio para todo o Brasil.", hero),
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
  const cards = (featured.length ? featured : products).flatMap(p => p.product_variants.length ? p.product_variants.map(v => ({ p, v: v as (typeof p.product_variants)[number] | undefined })) : [{ p, v: undefined as (typeof p.product_variants)[number] | undefined }]);
  const newCards = products.flatMap(p => p.product_variants.length ? p.product_variants.map(v => ({ p, v: v as (typeof p.product_variants)[number] | undefined })) : [{ p, v: undefined as (typeof p.product_variants)[number] | undefined }]);

  return (
    <>
      <HomeImages><section className="relative grid overflow-hidden border-b border-border md:h-[650px]">
        <img src={hero} alt="Carretéis de filamento 3D e bico de impressora extrudando filamento laranja" width={1600} height={1008} className="col-start-1 row-start-1 h-auto w-full self-center object-contain md:absolute md:inset-0 md:h-full md:object-cover" />
        <div className="container-x relative col-start-1 row-start-1 self-center py-6 md:py-36">
          <div className="max-w-xl animate-rise">
            <HomeHeroText />

          </div>
        </div>
      </section></HomeImages>

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
          {cards.slice(0, 8).map(({ p, v }) => <ProductCard key={v?.id ?? p.id} p={p} variant={v} />)}
        </div>
      </section>

      <section className="container-x mt-16">
        <h2 className="text-2xl font-bold md:text-3xl">Lançamentos</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {newCards.slice(0, 4).map(({ p, v }) => <ProductCard key={v?.id ?? p.id} p={p} variant={v} />)}
        </div>
        {products.length <= 1 && <p className="mt-4 text-sm text-muted-foreground">Novos produtos chegando em breve.</p>}
      </section>

      <section className="container-x mt-16 grid gap-4 md:grid-cols-4">
        {[
          [Truck, "Envio para todo o Brasil", `Impressoras com frete grátis · demais pedidos: ${brl(SHIPPING_FLAT)}, grátis acima de R$ 600 no Pix`],
          [MapPin, "Endereço pelo CEP", "Digite o CEP e preenchemos o endereço"],
          [CreditCard, "Formas de pagamento", "Pix no checkout · cartão de crédito via WhatsApp"],
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

      <section className="container-x mt-16" aria-labelledby="trust-heading">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Compre com informação</p>
          <h2 id="trust-heading" className="mt-2 text-2xl font-bold md:text-3xl">Conheça a 3DFLEX antes de comprar</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Confira como funciona o pagamento, quais são as condições de envio e como entrar em contato. Consulte as informações da loja e tire suas dúvidas antes de finalizar o pedido.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["sobre", "Sobre a 3DFLEX", "Quem somos e como atendemos."],
              ["envio", "Envio e frete", "Valores e orientações para acompanhar o pedido."],
              ["trocas", "Trocas e devoluções", "Direitos do consumidor e como solicitar atendimento."],
              ["contato", "Canais de atendimento", "Tire dúvidas antes e depois da compra."],
            ] as const).map(([slug, title, description]) => (
              <Link key={slug} to="/info/$slug" params={{ slug }} className="group rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-primary">
                <h3 className="font-semibold text-foreground">{title} <ArrowRight aria-hidden="true" className="ml-1 inline size-4 text-primary transition-transform group-hover:translate-x-1" /></h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
              </Link>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">Antes de pagar, confira os dados de contato e a identificação comercial disponíveis no <Link to="/info/$slug" params={{ slug: "contato" }} className="text-primary underline">atendimento</Link>.</p>
        </div>
      </section>

      {categories.filter(category => products.some(product => product.category_id === category.id)).map(category => <section key={category.id} className="container-x mt-12"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">{category.name}</h2><Link to="/produtos" search={{ categoria: category.slug }} className="min-h-11 shrink-0 py-3 text-sm font-semibold text-primary">Ver categoria</Link></div><div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">{products.filter(product => product.category_id === category.id).slice(0, 4).map(product => <ProductCard key={product.id} p={product} />)}</div></section>)}
      <StoreBenefits />
      <SiteReviews />

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
