import { Check, ShoppingCart, Truck, ShieldCheck, CreditCard, ArrowLeft, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PaymentPrice } from "@/components/site/PaymentPrice";
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
  const simpleProduct = p.categories?.slug !== "filamentos" && p.product_variants.length === 1 && p.product_variants[0].color === "Padrão";
  const v = p.product_variants.find((x) => x.id === selectedVariantId) ?? (simpleProduct ? p.product_variants[0] : undefined);
  const selectedIndex = p.product_variants.findIndex(x => x.id === v?.id);
  const variantImage = selectedIndex >= 0 ? (p.images?.[selectedIndex + 1] || productImage(p)) : productImage(p);
  const selectedImage = galleryImage ?? variantImage;

  const limit = v ? quantityLimit({ variantId: v.id, productSlug: p.slug, name: p.name, color: v.color, price: p.price, quantity: 1, stock: v.stock }) : 1;
  const inCart = cart.items.find(i => i.variantId === v?.id)?.quantity ?? 0;
  const available = Math.max(0, limit - inCart);
  const add = (go: boolean) => {
    const requested = Math.min(qty, Math.max(1, available));
    if (!v) { toast.error("Selecione uma opção do produto"); return; }
    if (available < requested) { toast.error("Quantidade máxima disponível para este produto atingida"); return; }
    cart.add({ variantId: v.id, productSlug: p.slug, name: p.name, color: v.color, price: p.price, image: variantImage, quantity: requested, stock: v.stock });
    if (go) nav({ to: "/carrinho" });
    else toast.success("Adicionado ao carrinho");
  };

  return (
    <><div className="container-x pt-7"><Link to="/produtos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> Voltar ao catálogo</Link></div><section className="container-x grid gap-7 py-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-10">
      <div className="min-w-0 space-y-3"><button type="button" className="w-full overflow-hidden rounded-2xl border border-border bg-card p-3 sm:p-5" aria-label="Ampliar foto do produto" onClick={() => setZoom(true)}><img src={selectedImage} alt={v ? `${p.name} — ${v.color}` : p.name} width={800} height={800} className="aspect-square w-full rounded-xl object-contain" /></button>
        <div className="flex gap-2 overflow-x-auto pb-2">{p.images.filter(Boolean).map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => setGalleryImage(image)} aria-label={`Ver foto ${index + 1}`} aria-pressed={selectedImage === image} className={`shrink-0 rounded-xl border p-1 focus-visible:outline-primary ${selectedImage === image ? "border-primary" : "border-border"}`}><img src={image} alt={`${p.name} — foto ${index + 1}`} loading="lazy" width={72} height={72} className="size-16 object-contain" /></button>)}</div>
        {zoom && <Dialog open={zoom} onOpenChange={setZoom}><DialogContent className="max-w-3xl"><DialogTitle>{p.name}</DialogTitle><DialogDescription>Imagem ampliada do produto selecionado.</DialogDescription><img src={selectedImage} alt={v ? `${p.name} — ${v.color}` : p.name} className="max-h-[70vh] w-full object-contain" /></DialogContent></Dialog>}
      </div>
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-primary">{p.brand}</p>{v && <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${v.stock > 0 ? "border-green-600/40 bg-green-600/10 text-green-500" : "border-border text-muted-foreground"}`}>{v.stock > 0 ? "Em estoque" : "Consulte disponibilidade"}</span>}</div>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{p.name}</h1>
        {p.description && <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
        <PaymentPrice price={p.price} productName={p.name} prominent />
        {(p.material || p.weight || p.diameter) && <dl className="grid grid-cols-3 gap-2 text-sm">
          {[["Material", p.material], ["Peso", p.weight], ["Diâmetro", p.diameter]].map(([k, val]) => (
            <div key={k} className="rounded-lg bg-card p-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{val ?? "—"}</dd></div>
          ))}
        </dl>}
        {!simpleProduct && <div>
          <p aria-live="polite" className="mb-2 text-sm font-semibold">{p.categories?.slug === "filamentos" ? "Cor" : "Modelo"}: {v?.color ?? "selecione"}</p>
          <div className="flex flex-wrap gap-2">
            {p.product_variants.map((x) => (
              <button key={x.id} onClick={() => { setVid(x.id); setGalleryImage(null); setQty(1); void nav({ to: "/produto/$slug", params: { slug }, search: { cor: x.id }, replace: true, resetScroll: false }); }} title={x.color} aria-label={x.color}
                aria-pressed={v?.id === x.id} className={p.categories?.slug === "filamentos" ? `group relative flex w-14 flex-col items-center gap-1 rounded-lg p-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${v?.id === x.id ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"}` : `min-h-11 rounded-lg border-2 px-4 py-2 text-sm font-semibold ${v?.id === x.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}>
                {p.categories?.slug === "filamentos" ? <><span aria-hidden="true" className="relative block size-11 shrink-0 rounded-full border-2 border-white/30" style={{ background: x.color_hex ?? undefined }}>
                  {v?.id === x.id && <Check className="absolute -bottom-1 -right-1 size-5 rounded-full bg-[#FF6A00] p-0.5 text-black" />}
                </span>
                <span className="line-clamp-2 min-h-7 w-full break-words text-[10px] leading-tight">{x.color}</span></> : x.color}
              </button>
            ))}
          </div>
          {v && <p className="mt-2 text-sm text-muted-foreground">{v.stock > 0 ? "Disponível" : /filamento/i.test(p.name) ? "Sob encomenda" : "Indisponível"}</p>}
        </div>}
        <div className="flex items-center gap-3">
          <label className="text-sm">Qtd.</label>
          <input type="number" min={1} max={Math.max(1, available)} value={Math.min(qty, Math.max(1, available))} aria-label="Quantidade" disabled={available === 0} onChange={(e) => setQty(Math.max(1, Math.min(Math.max(1, available), Math.floor(Number(e.target.value)) || 1)))} className="h-10 w-20 rounded-lg border border-input bg-card px-3" />
        </div>
        {v && inCart > 0 && <p role="status" className="text-sm text-muted-foreground">{inCart} unidade(s) deste produto no carrinho.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="buy" size="xl" className="w-full gap-2" disabled={!v || available === 0} onClick={() => add(false)}><ShoppingCart className="size-5" /> Adicionar ao carrinho</Button>
          <Button variant="outline" size="xl" className="w-full" disabled={!v || available === 0} onClick={() => add(true)}>Comprar agora</Button>
        </div>
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-2"><div className="flex items-start gap-2"><Truck className="mt-0.5 size-5 shrink-0 text-primary" /><span>Envio para todo o Brasil. <strong className="block">Frete grátis acima de R$ 600 no Pix.</strong></span></div><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><span>Informações de pagamento e pedido disponíveis no checkout.</span></div><div className="flex items-start gap-2"><CreditCard className="mt-0.5 size-5 shrink-0 text-primary" /><span>Cartão com juros da maquineta. Simule pelo WhatsApp.</span></div><Link to="/info/$slug" params={{ slug: "trocas" }} className="flex items-start gap-2 hover:text-primary"><RotateCcw className="mt-0.5 size-5 shrink-0 text-primary" /><span>Consulte nossa política de trocas e devoluções.</span></Link></div>
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
