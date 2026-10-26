import { Check, ShoppingCart, ArrowLeft, Minus, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PaymentPrice } from "@/components/site/PaymentPrice";
import { ProductGallery } from "@/components/site/ProductGallery";
import { StoreBenefits, PurchaseSupport } from "@/components/site/StoreBenefits";
import { productHead } from "@/lib/seo";
import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductReviews, ProductReviewSummary } from "@/components/site/ProductReviews";
import { productImage, productQuery } from "@/lib/catalog";
import { quantityLimit } from "@/lib/cart-stock";
import { useCart } from "@/lib/cart";
import { brl, lookupCep, maskCep, type CepAddress } from "@/lib/store";
import { FIXED_SHIPPING_BRL } from "@/lib/shipping";

export const Route = createFileRoute("/produto/$slug")({
  validateSearch: (s: Record<string, unknown>): { cor?: string } => ({
    cor: typeof s.cor === "string" ? s.cor : undefined,
  }),
  loaderDeps: ({ search }) => ({ cor: search.cor }),
  loader: async ({ context, params, deps }) => {
    const product = await context.queryClient.fetchQuery(productQuery(params.slug));
    if (!product) throw notFound();
    return { product, cor: deps.cor };
  },
  head: ({ loaderData }) =>
    loaderData
      ? productHead(loaderData.product, loaderData.cor)
      : {
          meta: [
            { title: "Produto não encontrado | 3DFLEX" },
            { name: "robots", content: "noindex" },
          ],
        },
  notFoundComponent: () => (
    <section className="container-x py-12">
      <h1 className="text-2xl font-bold">Produto não encontrado</h1>
      <p className="mt-3">
        Este produto não está disponível.{" "}
        <a href="/produtos" className="text-primary underline">
          Ver catálogo
        </a>
      </p>
    </section>
  ),
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
  const {
    data: p,
    isLoading,
    isError,
  } = useQuery({ ...productQuery(slug), initialData: initial.product });
  const cart = useCart();
  const nav = useNavigate();
  const [vid, setVid] = useState<string>();
  const [galleryImage, setGalleryImage] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [cep, setCep] = useState("");
  const [addr, setAddr] = useState<CepAddress | null>(null);

  if (isLoading) return <p className="container-x py-10">Carregando...</p>;
  if (isError)
    return (
      <p role="alert" className="container-x py-10">
        Não foi possível carregar o produto. Atualize a página para tentar novamente.
      </p>
    );
  if (!p) return <p className="container-x py-10">Produto não encontrado.</p>;
  const selectedVariantId = vid ?? cor;
  const simpleProduct =
    p.categories?.slug !== "filamentos" &&
    p.product_variants.length === 1 &&
    p.product_variants[0].color === "Padrão";
  const v =
    p.product_variants.find((x) => x.id === selectedVariantId) ??
    (simpleProduct ? p.product_variants[0] : undefined);
  const selectedIndex = p.product_variants.findIndex((x) => x.id === v?.id);
  const variantImage =
    selectedIndex >= 0 ? p.images?.[selectedIndex + 1] || productImage(p) : productImage(p);
  const selectedImage = galleryImage ?? variantImage;

  const limit = v
    ? quantityLimit({
        variantId: v.id,
        productSlug: p.slug,
        name: p.name,
        color: v.color,
        price: p.price,
        quantity: 1,
        stock: v.stock,
      })
    : 1;
  const inCart = cart.items.find((i) => i.variantId === v?.id)?.quantity ?? 0;
  const available = Math.max(0, limit - inCart);
  const add = (go: boolean) => {
    const requested = Math.min(qty, Math.max(1, available));
    if (!v) {
      toast.error("Selecione uma opção do produto");
      return;
    }
    if (available < requested) {
      toast.error("Quantidade máxima disponível para este produto atingida");
      return;
    }
    cart.add({
      variantId: v.id,
      productSlug: p.slug,
      name: p.name,
      color: v.color,
      price: p.price,
      image: variantImage,
      quantity: requested,
      stock: v.stock,
    });
    if (go) nav({ to: "/carrinho" });
    else toast.success("Adicionado ao carrinho");
  };

  return (
    <>
      <div className="container-x pt-7">
        <Link
          to="/produtos"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Voltar ao catálogo
        </Link>
      </div>
      <section className="container-x grid gap-7 py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <ProductGallery
          images={p.images}
          selectedImage={selectedImage}
          name={v ? `${p.name} — ${v.color}` : p.name}
          onSelect={setGalleryImage}
        />
        <div className="min-w-0 space-y-5">
          <div className="space-y-3">
            <span
              className={`inline-block rounded-lg border px-3 py-1 text-xs font-semibold ${(v ? v.stock > 0 : p.product_variants.some((item) => item.stock > 0)) ? "border-green-600/40 bg-green-600/10 text-green-400" : "border-border text-muted-foreground"}`}
            >
              {(v ? v.stock > 0 : p.product_variants.some((item) => item.stock > 0))
                ? "Em estoque"
                : /filamento/i.test(p.name)
                  ? "Sob encomenda"
                  : "Indisponível"}
            </span>
            {p.brand && <p className="text-sm font-semibold">{p.brand}</p>}
          </div>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{p.name}</h1>
          <ProductReviewSummary productId={p.id} />
          {(p.material || p.weight || p.diameter) && (
            <dl className="flex flex-wrap gap-2 text-xs">
              {(
                [
                  ["Material", p.material],
                  ["Peso", p.weight],
                  ["Diâmetro", p.diameter],
                ] as const
              )
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border px-3 py-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="mt-1 font-semibold">{value}</dd>
                  </div>
                ))}
            </dl>
          )}
          <PaymentPrice price={p.price} productName={p.name} prominent />
          {!simpleProduct && (
            <div>
              <p aria-live="polite" className="mb-2 text-sm font-semibold">
                {p.categories?.slug === "filamentos" ? "Cor" : "Modelo"}: {v?.color ?? "selecione"}
              </p>
              <div className="flex flex-wrap gap-2">
                {p.product_variants.map((x) => (
                  <button
                    key={x.id}
                    onClick={() => {
                      setVid(x.id);
                      setGalleryImage(null);
                      setQty(1);
                      void nav({
                        to: "/produto/$slug",
                        params: { slug },
                        search: { cor: x.id },
                        replace: true,
                        resetScroll: false,
                      });
                    }}
                    title={x.color}
                    aria-label={x.color}
                    aria-pressed={v?.id === x.id}
                    className={
                      p.categories?.slug === "filamentos"
                        ? `group relative flex w-14 flex-col items-center gap-1 rounded-lg p-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${v?.id === x.id ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"}`
                        : `min-h-11 rounded-lg border-2 px-4 py-2 text-sm font-semibold ${v?.id === x.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`
                    }
                  >
                    {p.categories?.slug === "filamentos" ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="relative block size-11 shrink-0 rounded-full border-2 border-white/30"
                          style={{ background: x.color_hex ?? undefined }}
                        >
                          {v?.id === x.id && (
                            <Check className="absolute -bottom-1 -right-1 size-5 rounded-full bg-[#FF6A00] p-0.5 text-black" />
                          )}
                        </span>
                        <span className="line-clamp-2 min-h-7 w-full break-words text-[10px] leading-tight">
                          {x.color}
                        </span>
                      </>
                    ) : (
                      x.color
                    )}
                  </button>
                ))}
              </div>
              {v && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {v.stock > 0
                    ? "Disponível"
                    : /filamento/i.test(p.name)
                      ? "Sob encomenda"
                      : "Indisponível"}
                </p>
              )}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
            <div>
              <p className="mb-2 text-sm">Quantidade</p>
              <div className="flex h-12 items-center overflow-hidden rounded-lg border border-input bg-card">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  disabled={!v || qty <= 1 || available === 0}
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                  className="grid size-12 shrink-0 place-items-center disabled:opacity-40"
                >
                  <Minus className="size-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, available)}
                  value={Math.min(qty, Math.max(1, available))}
                  aria-label="Quantidade"
                  disabled={!v || available === 0}
                  onChange={(e) =>
                    setQty(
                      Math.max(
                        1,
                        Math.min(Math.max(1, available), Math.floor(Number(e.target.value)) || 1),
                      ),
                    )
                  }
                  className="h-12 w-14 min-w-0 bg-transparent text-center text-base outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                />
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  disabled={!v || qty >= available}
                  onClick={() => setQty((n) => Math.min(available, n + 1))}
                  className="grid size-12 shrink-0 place-items-center disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            <Button
              size="xl"
              className="h-12 w-full gap-2 rounded-lg px-3 font-bold"
              disabled={!v || available === 0}
              onClick={() => add(false)}
            >
              <ShoppingCart className="size-5" /> Adicionar ao carrinho
            </Button>
          </div>
          {v && inCart > 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              {inCart} unidade(s) deste produto no carrinho.
            </p>
          )}
          <button
            type="button"
            className="min-h-11 text-sm font-semibold text-primary underline disabled:opacity-40"
            disabled={!v || available === 0}
            onClick={() => add(true)}
          >
            Comprar agora
          </button>
          <PurchaseSupport />
          <form
            className="rounded-xl border border-border bg-card p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setAddr(await lookupCep(cep));
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <p className="mb-2 text-sm font-semibold">Consultar endereço pelo CEP</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={cep}
                onChange={(e) => setCep(maskCep(e.target.value))}
                placeholder="00000-000"
                aria-label="CEP"
                className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3"
              />
              <Button type="submit">Consultar CEP</Button>
            </div>
            {addr && (
              <p className="mt-3 text-sm">
                {addr.street}, {addr.district} — {addr.city}/{addr.state}
                <br />
                <span className="text-muted-foreground">
                  Frete fixo: {brl(FIXED_SHIPPING_BRL)}. Grátis acima de R$ 600,00 no Pix.
                </span>
              </p>
            )}
          </form>
        </div>
      </section>
      <StoreBenefits />
      {(p.description || p.material || p.weight || p.diameter) && (
        <section className="container-x mt-3" aria-labelledby="product-description-heading">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
            <h2 id="product-description-heading" className="text-xl font-bold sm:text-2xl">
              Descrição e especificações
            </h2>
            {p.description && (
              <div className="mt-5 whitespace-pre-line break-words text-sm leading-7 text-muted-foreground sm:text-base">
                {p.description}
              </div>
            )}
            {(p.material || p.weight || p.diameter) && (
              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["Marca", p.brand],
                    ["Material", p.material],
                    ["Peso", p.weight],
                    ["Diâmetro", p.diameter],
                    [
                      p.categories?.slug === "filamentos" ? "Cor" : "Modelo",
                      v?.color === "Padrão" ? null : v?.color,
                    ],
                  ] as const
                )
                  .filter(([, value]) => Boolean(value))
                  .map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border bg-background p-4">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="mt-1 font-semibold">{value}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>
        </section>
      )}
      <ProductReviews productId={p.id} />
    </>
  );
}
