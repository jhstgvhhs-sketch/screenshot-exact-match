import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, CreditCard, Wallet, ArrowRight } from "lucide-react";
import { quantityLimit } from "@/lib/cart-stock";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/store";
import { DEFAULT_SHIPPING_SETTINGS, hasFreePixShipping, hasPrinter, shippingForOrder } from "@/lib/shipping";
import { useShippingSettings } from "@/lib/shipping-settings";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" },
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
  const shippingSettingsQuery = useShippingSettings();
  const shippingSettings = shippingSettingsQuery.data ?? DEFAULT_SHIPPING_SETTINGS;
  const printerShipping = hasPrinter(items);
  const eligibleForFreePixShipping =
    shippingSettings.fixed_shipping_brl > 0 && hasFreePixShipping(subtotal, items, shippingSettings);
  const shipping = shippingForOrder(subtotal, "pix", items, shippingSettings);
  const remainingForFreeShipping = Math.max(
    0,
    Math.round((shippingSettings.free_pix_shipping_threshold_brl - subtotal) * 100 + 1) / 100,
  );
  return (
    <section className="container-x py-10">
      <h1 className="text-3xl font-bold">Carrinho</h1>
      {items.length === 0 ? <p className="mt-6 text-muted-foreground">Seu carrinho está vazio.</p> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.variantId} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-nowrap">
                <img src={i.image} alt="" width={64} height={64} className="size-16 rounded-lg object-cover" />
                <div className="flex-1"><p className="font-semibold">{i.name}</p><p className="text-sm text-muted-foreground">{i.color !== "Padrão" ? `${i.color} · ` : ""}{brl(i.price)} no Pix</p></div>
                <input type="number" min={1} max={quantityLimit(i)} value={i.quantity} aria-label="Quantidade" onChange={(e) => setQty(i.variantId, Number(e.target.value))} className="h-9 w-16 rounded-lg border border-input bg-background px-2" />
                <button aria-label="Remover" onClick={() => remove(i.variantId)}><Trash2 className="size-4 text-muted-foreground" /></button>
              </li>
            ))}
          </ul>
          <aside className="h-fit space-y-3 rounded-2xl border border-border bg-card p-5 text-sm lg:sticky lg:top-52">
            {!printerShipping && shippingSettings.free_pix_shipping_enabled && shippingSettings.fixed_shipping_brl > 0 && !eligibleForFreePixShipping && <p role="status" className="rounded-lg border border-primary/40 bg-primary/10 p-3 font-semibold text-foreground">Faltam apenas {brl(remainingForFreeShipping)} para ganhar frete grátis no Pix!</p>}
            {printerShipping && <p role="status" className="text-sm font-bold text-green-500">Frete grátis na compra de qualquer impressora — Pix ou cartão.</p>}
            {eligibleForFreePixShipping && <p role="status" className="rounded-lg border border-green-600/40 bg-green-600/10 p-3 font-semibold text-green-600">Parabéns! Você ganhou frete grátis no Pix!</p>}
            <div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
            <div className="flex justify-between"><span>Frete no Pix</span><span>{shipping === 0 ? <span className="font-bold text-green-600">GRÁTIS</span> : brl(shippingSettings.fixed_shipping_brl)}</span></div>
            {eligibleForFreePixShipping && <div className="flex justify-between text-green-600"><span>Desconto no frete (Pix)</span><span>-{brl(shippingSettings.fixed_shipping_brl)}</span></div>}
            <div className="flex justify-between border-t border-border pt-3 text-lg font-bold"><span className="flex items-center gap-2"><Wallet className="size-5 text-primary" /> Total no Pix</span><span className="text-primary">{brl(subtotal + shipping)}</span></div>
            <p className="flex items-start gap-2 rounded-lg border border-border bg-background p-3 text-xs leading-relaxed text-muted-foreground"><CreditCard className="mt-0.5 size-4 shrink-0 text-primary" /> {printerShipping ? "Compra com impressora: consulte o parcelamento em até 10x sem juros pelo WhatsApp." : "Cartão de crédito: parcelamento com juros da maquineta. Simule o valor final pelo WhatsApp."}</p>
            <Link to="/checkout" className="mt-4 block rounded-lg bg-primary px-4 py-3 text-center font-bold text-primary-foreground hover:opacity-90">Prosseguir para checkout <ArrowRight className="ml-2 inline size-4" /></Link><p className="pt-2 text-xs text-muted-foreground">{`Com impressora: frete grátis em qualquer forma de pagamento. ${shippingSettings.free_pix_shipping_enabled ? `Nos demais pedidos: frete grátis acima de ${brl(shippingSettings.free_pix_shipping_threshold_brl)} exclusivamente no Pix; fora da promoção, frete de ${brl(shippingSettings.fixed_shipping_brl)}.` : `Nos demais pedidos, frete fixo de ${brl(shippingSettings.fixed_shipping_brl)}.`} O valor final depende da forma de pagamento escolhida no checkout.`}</p>
          </aside>
        </div>
      )}
    </section>
  );
}
