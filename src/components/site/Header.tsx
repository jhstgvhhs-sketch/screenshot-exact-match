import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  Shield,
  MessageCircle,
  Truck,
  Headphones,
} from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { categoriesQuery } from "@/lib/catalog";
import { brl } from "@/lib/store";
import { brazilPhone } from "@/lib/tracking";
import { useStoreSettings } from "./StoreSettings";

export function Header() {
  const { count, subtotal } = useCart();
  const { isAdmin } = useAuth();
  const { data: categories = [] } = useQuery(categoriesQuery());
  const { data: settings } = useStoreSettings();
  const whatsapp = brazilPhone(settings?.whatsapp ?? "");
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    nav({ to: "/produtos", search: { q: q.trim() || undefined } });
    setOpen(false);
  };
  const categoryLinks = categories.map((c) => (
    <Link
      key={c.slug}
      to="/produtos"
      search={{ categoria: c.slug }}
      onClick={() => setOpen(false)}
      className="inline-flex min-h-11 items-center whitespace-nowrap px-3 text-sm font-semibold text-muted-foreground hover:text-primary"
    >
      {c.name}
    </Link>
  ));
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="bg-primary px-3 py-1.5 text-center text-[10px] font-bold tracking-widest text-primary-foreground sm:text-xs">
        IMPRESSORAS COM FRETE GRÁTIS · DEMAIS PEDIDOS ACIMA DE R$ 600,00 NO PIX
      </div>
      <div className="container-x flex min-h-20 items-center gap-3 py-3 lg:min-h-24 lg:gap-7">
        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-card lg:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="store-mobile-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <Link
          to="/"
          aria-label="3DFLEX — início"
          className="shrink-0 font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          <span className="text-primary">3D</span>FLEX
          <span className="mt-0.5 hidden font-sans text-[8px] font-medium uppercase tracking-widest text-muted-foreground lg:block">
            Filamentos e impressoras 3D
          </span>
        </Link>
        <form onSubmit={submit} className="hidden min-w-0 flex-1 md:block">
          <label className="relative block">
            <span className="sr-only">Pesquisar produtos</span>
            <Search
              aria-hidden="true"
              className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar produtos, marcas ou categorias..."
              className="h-12 w-full rounded-full border border-input bg-card pl-12 pr-4 text-sm outline-none focus:border-primary"
            />
          </label>
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3 lg:gap-5">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fale conosco pelo WhatsApp"
              className="hidden items-center gap-2 rounded-lg p-2 lg:flex"
            >
              <MessageCircle className="size-7 text-green-500" />
              <span className="hidden text-sm xl:block">
                <strong className="block">Fale conosco</strong>
                <span className="text-xs text-muted-foreground">Atendimento via WhatsApp</span>
              </span>
            </a>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              search={{ section: "dashboard" }}
              aria-label="Painel"
              className="rounded-lg p-2 text-primary hover:bg-accent"
            >
              <Shield className="size-5" />
            </Link>
          )}
          <Link
            to="/conta"
            aria-label="Minha conta"
            className="flex min-h-11 items-center gap-2 rounded-lg p-2 hover:bg-card"
          >
            <User className="size-6" />
            <span className="hidden text-sm xl:block">
              <strong className="block">Minha conta</strong>
              <span className="text-xs text-muted-foreground">Entrar / Cadastrar</span>
            </span>
          </Link>
          <Link
            to="/carrinho"
            aria-label={`Carrinho, ${count} itens`}
            className="flex min-h-11 items-center gap-3 rounded-lg p-2 hover:bg-card"
          >
            <span className="relative">
              <ShoppingCart className="size-6 sm:size-7" />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </span>
            <span className="hidden text-sm xl:block">
              <strong className="block">Carrinho</strong>
              <span className="text-primary">{brl(subtotal)}</span>
            </span>
          </Link>
        </div>
      </div>
      <div className="hidden border-t border-border lg:block">
        <div className="container-x flex items-center gap-3 py-2">
          <Link
            to="/produtos"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            <Menu className="size-4" />
            Todas as categorias
          </Link>
          <nav aria-label="Categorias da loja" className="flex min-w-0 flex-1 overflow-x-auto">
            {categoryLinks}
          </nav>
          <Link
            to="/info/$slug"
            params={{ slug: "envio" }}
            className="hidden shrink-0 items-center gap-2 text-xs 2xl:flex"
          >
            <Truck className="size-6" />
            Envio para
            <br />
            todo o Brasil
          </Link>
          <Link
            to="/info/$slug"
            params={{ slug: "contato" }}
            className="hidden shrink-0 items-center gap-2 text-xs xl:flex"
          >
            <Headphones className="size-5" />
            Suporte especializado
          </Link>
        </div>
      </div>
      {open && (
        <div
          id="store-mobile-menu"
          className="container-x max-h-[65vh] overflow-y-auto border-t border-border py-4 lg:hidden"
        >
          <form onSubmit={submit} className="mb-3 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar produtos..."
              aria-label="Pesquisar produtos"
              className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-base"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground"
            >
              <Search />
            </button>
          </form>
          <nav aria-label="Categorias no celular" className="flex flex-col">
            <Link to="/produtos" onClick={() => setOpen(false)} className="px-3 py-3 font-bold">
              Todos os produtos
            </Link>
            {categoryLinks}
          </nav>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 px-3 text-sm text-green-500"
            >
              <MessageCircle className="size-5" />
              Fale conosco
            </a>
          )}
        </div>
      )}
    </header>
  );
}
