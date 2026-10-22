import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { quantityLimit } from "@/lib/cart-stock";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/store";
import { FIXED_SHIPPING_BRL } from "@/lib/shipping";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — 3DFLEX" },
      { name: "description", content: "Seu carrinho de compras 3DFLEX." },
      { property: "og:title", content: "Carrinho — 3DFLEX" },
      { property: "og:description", content: "Seu carrinho de compras 3DFLEX." },
    ],
  }),
  component: Carrinho,
});

function Carrinho() {
  const { items, setQty, remove, subtotal } = useCart();
  return (
    <section className="container-x py-10">
      <h1 className="text-3xl font-bold">Carrinho</h1>
      {items.length === 0 ? <p className="mt-6 text-muted-foreground">Seu carrinho está vazio.</p> : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.variantId} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
                <img src={i.image} alt="" width={64} height={64} className="size-16 rounded-lg object-cover" />
                <div className="flex-1"><p className="font-semibold">{i.name}</p><p className="text-sm text-muted-foreground">{i.color} · {brl(i.price)}</p></div>
                <input type="number" min={1} max={quantityLimit(i)} value={i.quantity} aria-label="Quantidade" onChange={(e) => setQty(i.variantId, Number(e.target.value))} className="h-9 w-16 rounded-lg border border-input bg-background px-2" />
                <button aria-label="Remover" onClick={() => remove(i.variantId)}><Trash2 className="size-4 text-muted-foreground" /></button>
              </li>
            ))}
          </ul>
          <aside className="h-fit space-y-2 rounded-xl border border-border bg-card p-5 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
            <div className="flex justify-between"><span>Frete</span><span>{brl(FIXED_SHIPPING_BRL)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-lg font-bold"><span>Total com frete</span><span>{brl(subtotal + FIXED_SHIPPING_BRL)}</span></div>
            <Link to="/checkout" className="mt-4 block rounded-lg bg-primary px-4 py-3 text-center font-bold text-primary-foreground hover:opacity-90">Prosseguir para checkout</Link><p className="pt-2 text-xs text-muted-foreground">Pagamentos ainda não ativados; nenhuma cobrança será realizada.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
