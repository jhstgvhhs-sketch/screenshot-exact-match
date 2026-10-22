import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  head: () => ({
    meta: [
      { title: "Produto — 3DFLEX" },
      { name: "description", content: "Detalhes do produto 3DFLEX." },
      { property: "og:title", content: "Produto — 3DFLEX" },
      { property: "og:description", content: "Detalhes do produto 3DFLEX." },
    ],
  }),
  component: ProdutoPage,
});

function ProdutoPage() {
  const { slug } = Route.useParams();
  const { data: p, isLoading } = useQuery(productQuery(slug));
  const cart = useCart();
  const nav = useNavigate();
  const [vid, setVid] = useState<string>();
  const [qty, setQty] = useState(1);
  const [cep, setCep] = useState("");
  const [addr, setAddr] = useState<CepAddress | null>(null);

  if (isLoading) return <p className="container-x py-10">Carregando...</p>;
  if (!p) return <p className="container-x py-10">Produto não encontrado.</p>;
  const v = p.product_variants.find((x) => x.id === vid);
  const selectedIndex = p.product_variants.findIndex(x => x.id === vid);
  const selectedImage = selectedIndex >= 0 ? (p.images?.[selectedIndex + 1] || productImage(p)) : productImage(p);

  const limit = v ? quantityLimit({ variantId: v.id, productSlug: p.slug, name: p.name, color: v.color, price: p.price, quantity: 1, stock: v.stock }) : 1;
  const inCart = cart.items.find(i => i.variantId === v?.id)?.quantity ?? 0;
  const available = Math.max(0, limit - inCart);
  const add = (go: boolean) => {
    if (!v) { toast.error("Selecione uma cor"); return; }
    if (available < qty) { toast.error("Limite de estoque dessa cor atingido no carrinho"); return; }
    cart.add({ variantId: v.id, productSlug: p.slug, name: p.name, color: v.color, price: p.price, image: selectedImage, quantity: qty, stock: v.stock });
    if (go) nav({ to: "/carrinho" });
    else toast.success("Adicionado ao carrinho");
  };

  return (
    <><section className="container-x grid gap-10 py-10 md:grid-cols-2">
      <img src={selectedImage} alt={v ? `${p.name} — ${v.color}` : p.name} width={800} height={800} className="aspect-square w-full rounded-xl border border-border object-cover" />
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
              <button key={x.id} onClick={() => { setVid(x.id); setQty(1); }} title={x.color} aria-label={x.color}
                className={`size-9 rounded-full border-2 ${vid === x.id ? "border-primary" : "border-border"} ${x.stock === 0 ? "opacity-40" : ""}`}
                style={{ background: x.color_hex ?? undefined }} />
            ))}
          </div>
          {v && <p className="mt-2 text-sm text-muted-foreground">{v.stock > 0 ? "Disponível" : "Indisponível no momento"}</p>}
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
        <form className="rounded-xl border border-border bg-card p-4" onSubmit={async (e) => { e.preventDefault(); try { setAddr(await lookupCep(cep)); } catch (err) { toast.error((err as Error).message); } }}>
          <p className="mb-2 text-sm font-semibold">Consultar endereço pelo CEP</p>
          <div className="flex gap-2">
            <input value={cep} onChange={(e) => setCep(maskCep(e.target.value))} placeholder="00000-000" aria-label="CEP" className="h-10 flex-1 rounded-lg border border-input bg-background px-3" />
            <Button type="submit">Consultar CEP</Button>
          </div>
          {addr && <p className="mt-3 text-sm">{addr.street}, {addr.district} — {addr.city}/{addr.state}<br /><span className="text-muted-foreground">Frete fixo: {brl(FIXED_SHIPPING_BRL)} para todo o Brasil.</span></p>}
        </form>
      </div>
    </section><ProductReviews productId={p.id} /></>
  );
}
