import { Link } from "@tanstack/react-router";
import { CreditCard, LockKeyhole, Mail, MessageCircle, ShieldCheck, Truck, Wallet } from "lucide-react";

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
          <p className="mt-3 text-sm text-muted-foreground">Loja especializada em filamentos, impressoras 3D e acessórios para suas criações.</p>
          <h3 className="mt-6 font-bold text-primary">Sobre a loja</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Na 3DFLEX você encontra materiais e soluções para impressão 3D, com atendimento dedicado e envio para todo o Brasil.</p>
        </div>
        <nav aria-label="Informações da loja">
          <h3 className="mb-3 font-bold text-primary">Informações</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {links.map(([slug, label]) => (
              <Link key={slug} to="/info/$slug" params={{ slug }} className="text-muted-foreground hover:text-primary">{label}</Link>
            ))}
          </div>
        </nav>
        <div>
          <h3 className="font-bold text-primary">Atendimento</h3>
          <p className="mt-3 text-sm text-muted-foreground">Precisa de ajuda com seu pedido ou com a escolha do filamento?</p>
          <Link to="/info/$slug" params={{ slug: "contato" }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"><MessageCircle size={17} className="text-primary"/>Fale conosco</Link>
          <p className="mt-4 text-xs text-muted-foreground">Os canais de contato são informados na página de atendimento.</p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-x grid gap-10 py-9 md:grid-cols-2">
          <div>
            <h3 className="font-bold text-primary">Pague com</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-bold"><Wallet size={19} className="text-primary"/> Pix</span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-bold"><CreditCard size={19} className="text-primary"/> Cartão via atendimento</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Disponibilidade e instruções de pagamento são apresentadas na finalização do pedido.</p>
          </div>
          <div>
            <h3 className="font-bold text-primary">Segurança e entrega</h3>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><LockKeyhole size={20} className="text-primary"/> Conexão protegida por HTTPS</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck size={20} className="text-primary"/> Privacidade e proteção de dados</span>
              <span className="inline-flex items-center gap-2"><Truck size={20} className="text-primary"/> Envio para todo o Brasil</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Não exibimos selos ou certificações de terceiros sem validação.</p>
          </div>
        </div>
      </div>
      <p className="border-t border-border py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} 3DFLEX. Todos os direitos reservados.</p>
    </footer>
  );
}
