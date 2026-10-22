import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingCart, User, Menu, X, Shield } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";

const cats = [
  { label: "PLA", slug: "pla" },
  { label: "PETG", slug: "petg" },
  { label: "Acessórios", slug: "acessorios" },
];

export function Header() {
  const { count } = useCart();
  const { isAdmin } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    nav({ to: "/produtos", search: { q: q || undefined } });
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="bg-gradient-primary py-1.5 text-center text-[11px] font-bold tracking-[0.2em] text-primary-foreground">
        FILAMENTOS E ACESSÓRIOS PARA TODO O BRASIL
      </div>
      <div className="container-x flex h-16 items-center gap-4">
        <button className="md:hidden" aria-label="Abrir menu" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
        <Link to="/" className="font-display text-2xl font-extrabold tracking-tight">
          3D<span className="text-primary">FLEX</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-5 text-sm font-semibold md:flex">
          {cats.map((c) => (
            <Link key={c.slug} to="/produtos" search={{ categoria: c.slug }} className="text-muted-foreground transition-colors hover:text-primary">
              {c.label}
            </Link>
          ))}
        </nav>
        <form onSubmit={submit} className="ml-auto hidden max-w-sm flex-1 md:block">
          <label className="relative block">
            <span className="sr-only">Pesquisar produtos</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar filamentos, cores..." className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </label>
        </form>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          {isAdmin && (
            <Link to="/admin" aria-label="Painel" className="rounded-lg p-2 text-primary hover:bg-accent"><Shield className="size-5" /></Link>
          )}
          <Link to="/conta" aria-label="Minha conta" className="rounded-lg p-2 hover:bg-accent"><User className="size-5" /></Link>
          <Link to="/carrinho" aria-label="Carrinho" className="relative rounded-lg p-2 hover:bg-accent">
            <ShoppingCart className="size-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{count}</span>
            )}
          </Link>
        </div>
      </div>
      {open && (
        <div className="container-x space-y-3 border-t border-border pb-4 pt-3 md:hidden">
          <form onSubmit={submit}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produtos..." aria-label="Pesquisar produtos" className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary" />
          </form>
          {cats.map((c) => (
            <Link key={c.slug} to="/produtos" search={{ categoria: c.slug }} onClick={() => setOpen(false)} className="block font-semibold">{c.label}</Link>
          ))}
          <Link to="/conta" onClick={() => setOpen(false)} className="block font-semibold">Minha conta</Link>
        </div>
      )}
    </header>
  );
}
