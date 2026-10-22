import { Link } from "@tanstack/react-router";

const links = [
  ["sobre", "Sobre nós"], ["contato", "Contato"], ["privacidade", "Política de privacidade"],
  ["trocas", "Trocas e devoluções"], ["envio", "Política de envio"], ["termos", "Termos de uso"],
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card/40">
      <div className="container-x grid gap-10 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-extrabold">3D<span className="text-primary">FLEX</span></p>
          <p className="mt-2 text-sm text-muted-foreground">Filamentos e acessórios para impressão 3D.</p>
        </div>
        <nav className="grid grid-cols-2 gap-2 text-sm">
          {links.map(([slug, label]) => (
            <Link key={slug} to="/info/$slug" params={{ slug }} className="text-muted-foreground hover:text-primary">{label}</Link>
          ))}
        </nav>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>WhatsApp: <span className="text-foreground/60">a definir</span></p>
          <p>Instagram: <span className="text-foreground/60">a definir</span></p>
          <p>CNPJ: <span className="text-foreground/60">a definir</span></p>
          <p>Endereço comercial: <span className="text-foreground/60">a definir</span></p>
        </div>
      </div>
      <p className="border-t border-border py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} 3DFLEX</p>
    </footer>
  );
}
