import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { productHead } from "@/lib/seo";
import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductReviews } from "@/components/site/ProductReviews";
import { productImage, productQuery } from "@/lib/catalog";
import { quantityLimit } from "@/lib/cart-stock";
import { useCart } from "@/lib/cart";
import { brl, lookupCep, maskCep, type CepAddress } from "@/lib/store";
import { FIXED_SHIPPING_BRL } from "@/lib/shipping";

export const Route = createFileRoute("/produto/$slug")({
  validateSearch: (s: Record<string, unknown>): { cor?: string } => ({ cor: typeof s.cor === "string" ? s.cor : undefined }),
  loaderDeps: ({ search }) => ({ cor: search.cor }),
  loader: async ({ context, params, deps }) => {
    const product = await context.queryClient.fetchQuery(productQuery(params.slug));
    if (!product) throw notFound();
    return { product, cor: deps.cor };
  },
  head: ({ loaderData }) => loaderData ? productHead(loaderData.product, loaderData.cor) : { meta: [{ title: "Produto não encontrado | 3DFLEX" }, { name: "robots", content: "noindex" }] },
  notFoundComponent: () => <section className="container-x py-12"><h1 className="text-2xl font-bold">Produto não encontrado</h1><p className="mt-3">Este produto não está disponível. <a href="/produtos" className="text-primary underline">Ver catálogo</a></p></section>,
  component: ProdutoPage,
});

export function ProdutoPage() {
  const { slug } = Route.useParams();
  return <ProdutoContent key={slug} />;
}

function ProdutoContent() {
  const { slug } = Route.useParams();
  const { cor } = Route.useSearch();
  const initial = Route.useLoaderData();
  const { data: p, isLoading, isError } = useQuery({ ...productQuery(slug), initialData: initial.product });
  const cart = useCart();
  const nav = useNavigate();
  const [vid, setVid] = useState<string>();
  const [galleryImage, setGalleryImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const [qty, setQty] = useState(1);
  const [cep, setCep] = useState("");
  const [addr, setAddr] = useState<CepAddress | null>(null);

  if (isLoading) return <p className="container-x py-10">Carregando...</p>;
  if (isError) return <p role="alert" className="container-x py-10">Não foi possível carregar o produto. Atualize a página para tentar novamente.</p>;
  if (!p) return <p className="container-x py-10">Produto não encontrado.</p>;
  const selectedVariantId = vid ?? cor;
  const v = p.product_variants.find((x) => x.id === selectedVariantId);
  const selectedIndex = p.product_variants.findIndex(x => x.id === selectedVariantId);
  const variantImage = selectedIndex >= 0 ? (p.images?.[selectedIndex + 1] || productImage(p)) : productImage(p);
  const selectedImage = galleryImage ?? variantImage;

  const limit = v ? quantityLimit({ variantId: v.id, productSlug: p.slug, name: p.name, color: v.color, price: p.price, quantity: 1, stock: v.stock }) : 1;
  const inCart = cart.items.find(i => i.variantId === v?.id)?.quantity ?? 0;
  const available = Math.max(0, limit - inCart);
  const add = (go: boolean) => {
    const requested = Math.min(qty, Math.max(1, available));
    if (!v) { toast.error("Selecione uma cor"); return; }
    if (available < requested) { toast.error("Quantidade máxima disponível para essa cor atingida"); return; }
    cart.add({ variantId: v.id, productSlug: p.slug, name: p.name, color: v.color, price: p.price, image: variantImage, quantity: requested, stock: v.stock });
    if (go) nav({ to: "/carrinho" });
    else toast.success("Adicionado ao carrinho");
  };

  return (
    <><section className="container-x grid gap-10 py-10 md:grid-cols-2">
      <div className="min-w-0 space-y-3"><button type="button" className="w-full" aria-label="Ampliar foto do produto" onClick={() => setZoom(true)}><img src={selectedImage} alt={v ? `${p.name} — ${v.color}` : p.name} width={800} height={800} className="aspect-square w-full rounded-xl border border-border object-contain" /></button>
        <div className="flex gap-2 overflow-x-auto pb-2">{p.images.filter(Boolean).map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => setGalleryImage(image)} aria-label={`Ver foto ${index + 1}`} aria-pressed={selectedImage === image} className="shrink-0 rounded-lg border border-border p-1 focus-visible:outline-primary"><img src={image} alt={`${p.name} — foto ${index + 1}`} loading="lazy" width={72} height={72} className="size-16 object-contain" /></button>)}</div>
        {zoom && <Dialog open={zoom} onOpenChange={setZoom}><DialogContent className="max-w-3xl"><DialogTitle>{p.name}</DialogTitle><DialogDescription>Imagem ampliada do produto selecionado.</DialogDescription><img src={selectedImage} alt={v ? `${p.name} — ${v.color}` : p.name} className="max-h-[70vh] w-full object-contain" /></DialogContent></Dialog>}
      </div>
      <div className="space-y-5">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{p.brand}</p>
        <h1 className="text-3xl font-bold">{p.name}</h1>
        <p className="font-display text-3xl font-bold">{brl(p.price)}</p>
        <p className="text-muted-foreground">{p.description}</p>
        <dl className="grid grid-cols-3 gap-2 text-sm">
          {[["Material", p.material], ["Peso", p.weight], ["Diâmetro", p.diameter]].map(([k, val]) => (
            <div key={k} className="rounded-lg bg-card p-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{val ?? "—"}</dd></div>
          ))}
        </dl>
        <div>
          <p className="mb-2 text-sm font-semibold">Cor: {v?.color ?? "selecione"}</p>
          <div className="flex flex-wrap gap-2">
            {p.product_variants.map((x) => (
              <button key={x.id} onClick={() => { setVid(x.id); setGalleryImage(null); setQty(1); void nav({ to: "/produto/$slug", params: { slug }, search: { cor: x.id }, replace: true, resetScroll: false }); }} title={x.color} aria-label={x.color}
                aria-pressed={selectedVariantId === x.id} className={`size-11 rounded-full border-2 ${selectedVariantId === x.id ? "border-primary" : "border-border"}`}
                style={{ background: x.color_hex ?? undefined }} />
            ))}
          </div>
          {v && <p className="mt-2 text-sm text-muted-foreground">{v.stock > 0 ? "Disponível" : /filamento/i.test(p.name) ? "Sob encomenda" : "Indisponível"}</p>}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm">Qtd.</label>
          <input type="number" min={1} max={Math.max(1, available)} value={Math.min(qty, Math.max(1, available))} aria-label="Quantidade" disabled={available === 0} onChange={(e) => setQty(Math.max(1, Math.min(Math.max(1, available), Math.floor(Number(e.target.value)) || 1)))} className="h-10 w-20 rounded-lg border border-input bg-card px-3" />
        </div>
        {v && inCart > 0 && <p role="status" className="text-sm text-muted-foreground">{inCart} unidade(s) dessa cor no carrinho.</p>}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="xl" disabled={!!v && available === 0} onClick={() => add(false)}>Adicionar ao carrinho</Button>
          <Button variant="buy" size="xl" disabled={!!v && available === 0} onClick={() => add(true)}>Comprar agora</Button>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground"><p>Enviamos para todo o Brasil.</p><p>Frete grátis acima de R$ 600,00 exclusivamente no Pix.</p><p>Nota fiscal e rastreio: solicite pelo WhatsApp em Meus Pedidos.</p><a href="/info/trocas" className="inline-block text-primary underline">Trocas e devoluções</a></div>
        <form className="rounded-xl border border-border bg-card p-4" onSubmit={async (e) => { e.preventDefault(); try { setAddr(await lookupCep(cep)); } catch (err) { toast.error((err as Error).message); } }}>
          <p className="mb-2 text-sm font-semibold">Consultar endereço pelo CEP</p>
          <div className="flex flex-wrap gap-2">
            <input value={cep} onChange={(e) => setCep(maskCep(e.target.value))} placeholder="00000-000" aria-label="CEP" className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3" />
            <Button type="submit">Consultar CEP</Button>
          </div>
          {addr && <p className="mt-3 text-sm">{addr.street}, {addr.district} — {addr.city}/{addr.state}<br /><span className="text-muted-foreground">Frete fixo: {brl(FIXED_SHIPPING_BRL)}. Grátis acima de R$ 600,00 no Pix.</span></p>}
        </form>
      </div>
    </section><ProductReviews productId={p.id} /></>
  );
}
