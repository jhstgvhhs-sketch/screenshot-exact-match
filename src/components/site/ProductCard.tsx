import { Link } from "@tanstack/react-router";
import { brl } from "@/lib/store";
import { ArrowUpRight, CreditCard } from "lucide-react";
import { productImage, totalStock, type Product, type Variant } from "@/lib/catalog";

export function ProductCard({ p, variant }: { p: Product; variant?: Variant }) {
  const stock = variant ? variant.stock : totalStock(p);
  const isPrinter = p.categories?.slug === "impressoras";
  const imageIndex = variant ? p.product_variants.findIndex(v => v.id === variant.id) : -1;
  const image = imageIndex >= 0 ? (p.images?.[imageIndex + 1] || productImage(p)) : productImage(p);
  const simpleProduct = p.categories?.slug !== "filamentos" && p.product_variants.length === 1 && p.product_variants[0].color === "Padrão";
  const title = variant && !simpleProduct ? `${p.name} — ${variant.color}` : p.name;
  return (
    <Link to="/produto/$slug" params={{ slug: p.slug }} search={variant ? { cor: variant.id } : {}} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-primary">
      <div className="aspect-square overflow-hidden bg-muted/40 p-3">
        <img src={image} alt={title} loading="lazy" width={600} height={600} className="size-full rounded-xl object-contain transition-transform duration-300 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{p.brand}</p>
        <h3 className="line-clamp-2 font-semibold leading-snug">{title}</h3>
        {p.description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
        {simpleProduct ? null : variant ? <p className="text-xs text-muted-foreground">{p.categories?.slug === "filamentos" ? "Cor" : "Modelo"}: {variant.color}</p> : <div className="flex gap-1">
          {p.product_variants.slice(0, 8).map(v => <span key={v.id} title={v.color} className="size-3.5 rounded-full border border-border" style={{ background: v.color_hex ?? undefined }} />)}
          {p.product_variants.length > 8 && <span className="text-xs text-muted-foreground">+{p.product_variants.length - 8}</span>}
        </div>}
        <div className="mt-auto border-t border-border pt-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Preço no Pix</p><p className="font-display text-xl font-extrabold text-primary sm:text-2xl">{brl(p.price)}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><CreditCard className="size-3.5" /> {isPrinter ? "Até 10x sem juros no cartão" : "Cartão com juros · simule no WhatsApp"}</p><div className="mt-3 flex items-center justify-between gap-2"><span className={stock > 0 ? "text-xs text-green-500" : "text-xs text-muted-foreground"}>{stock > 0 ? "Em estoque" : /filamento/i.test(p.name) ? "Sob encomenda" : "Indisponível"}</span><span className="inline-flex items-center gap-1 text-xs font-bold text-primary">Ver produto <ArrowUpRight className="size-4" /></span></div></div>
      </div>
    </Link>
  );
}
