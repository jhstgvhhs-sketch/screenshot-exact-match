import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, UserRoundPlus, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";

const DISMISS_KEY = "3dflex:cadastro-convite:v1";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function RegistrationPrompt() {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || user || window.location.pathname === "/conta" || window.location.pathname.startsWith("/admin")) return;
    try {
      const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissedAt && Date.now() - dismissedAt < THIRTY_DAYS) return;
    } catch {
      // Continue without persistence when browser storage is unavailable.
    }
    const timer = window.setTimeout(() => setVisible(true), 3500);
    return () => window.clearTimeout(timer);
  }, [loading, user?.id]);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // The prompt is still dismissed for this render.
    }
    setVisible(false);
  }

  if (!visible || user) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="registration-prompt-title" aria-describedby="registration-prompt-description" className="relative w-full max-w-md rounded-2xl border border-border bg-background p-7 shadow-2xl">
        <button type="button" onClick={dismiss} aria-label="Fechar convite de cadastro" className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <X className="size-5" />
        </button>
        <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <UserRoundPlus className="size-7" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Bem-vindo à 3DFLEX</p>
        <h2 id="registration-prompt-title" className="mt-2 text-2xl font-extrabold">Crie sua conta e acompanhe tudo em um só lugar</h2>
        <p id="registration-prompt-description" className="mt-3 text-sm leading-6 text-muted-foreground">
          Cadastre-se para acompanhar seus pedidos, salvar seus dados e agilizar suas próximas compras. É rápido e gratuito.
        </p>
        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Seus dados ficam protegidos.
        </div>
        <Link to="/conta" search={{ cadastro: true }} onClick={dismiss} className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">
          Criar minha conta
        </Link>
        <button type="button" onClick={dismiss} className="mt-3 min-h-10 w-full text-sm font-medium text-muted-foreground hover:text-foreground">
          Continuar navegando sem cadastro
        </button>
      </section>
    </div>
  );
}
