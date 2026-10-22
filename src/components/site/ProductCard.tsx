import { Link } from "@tanstack/react-router";
import { brl } from "@/lib/store";
import { productImage, totalStock, type Product } from "@/lib/catalog";

export function ProductCard({ p }: { p: Product }) {
  const stock = totalStock(p);
  return (
    <Link to="/produto/$slug" params={{ slug: p.slug }} className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow">
      <div className="aspect-square overflow-hidden bg-muted">
        <img src={productImage(p)} alt={p.name} loading="lazy" width={600} height={600} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="space-y-2 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{p.brand}</p>
        <h3 className="line-clamp-2 font-semibold leading-snug">{p.name}</h3>
        <div className="flex gap-1">
          {p.product_variants.slice(0, 8).map((v) => (
            <span key={v.id} title={v.color} className="size-3.5 rounded-full border border-border" style={{ background: v.color_hex ?? undefined }} />
          ))}
          {p.product_variants.length > 8 && <span className="text-xs text-muted-foreground">+{p.product_variants.length - 8}</span>}
        </div>
        <div className="flex items-end justify-between pt-1">
          <span className="font-display text-xl font-bold">{brl(p.price)}</span>
          <span className={stock > 0 ? "text-xs text-success" : "text-xs text-muted-foreground"}>{stock > 0 ? "Em estoque" : "Indisponível"}</span>
        </div>
      </div>
    </Link>
  );
}
