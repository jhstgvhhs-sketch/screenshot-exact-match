import { useStoreSettings } from "@/components/site/StoreSettings";
import { brazilPhone } from "@/lib/tracking";
import { Link } from "@tanstack/react-router";
import { CreditCard, LockKeyhole, Mail, MessageCircle, ShieldCheck, Truck, Wallet } from "lucide-react";

const links = [
  ["sobre", "Sobre nós"], ["contato", "Contato"], ["privacidade", "Política de privacidade"],
  ["trocas", "Trocas e devoluções"], ["envio", "Política de envio"], ["termos", "Termos de uso"],
] as const;

export function Footer() {
  const { data: store } = useStoreSettings();
  const wa = brazilPhone(store?.whatsapp ?? "");
  return (
    <footer className="mt-24 border-t border-border bg-card/40">
      <div className="container-x grid gap-10 py-12 md:grid-cols-3">
        <div>
          {store?.logo_url ? <img src={store.logo_url} alt={store.business_name || "3DFLEX"} className="max-h-20 max-w-56 object-contain" /> : <p className="font-display text-2xl font-extrabold">3D<span className="text-primary">FLEX</span></p>}
          {store?.business_name && store.business_name !== "3DFLEX" && <p className="mt-2 font-semibold">{store.business_name}</p>}
          <p className="mt-3 text-sm text-muted-foreground">Loja especializada em filamentos, impressoras 3D e acessórios para suas criações.</p>
          <h3 className="mt-6 font-bold text-primary">Sobre a loja</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{store?.about || "Na 3DFLEX você encontra materiais e soluções para impressão 3D, com atendimento dedicado e envio para todo o Brasil."}</p>
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
          {wa && <a className="mt-3 block text-sm text-primary hover:underline" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp: {store?.whatsapp}</a>}
          {store?.phone && <p className="mt-2 text-sm text-muted-foreground">Telefone: {store.phone}</p>}
          {store?.email && <a className="mt-2 block break-all text-sm text-primary hover:underline" href={`mailto:${store.email}`}>{store.email}</a>}
          {store?.address && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">Endereço: {store.address}</p>}
          {store?.legal_name && <p className="mt-2 text-sm text-muted-foreground">Razão social: {store.legal_name}</p>}
          {store?.cnpj && <p className="mt-2 text-sm text-muted-foreground">CNPJ: {store.cnpj}</p>}
        </div>
      </div>
      {store?.banner_url && <div className="container-x pb-8"><img src={store.banner_url} alt={`Banner de ${store.business_name || "3DFLEX"}`} className="max-h-64 w-full rounded-xl object-contain" /></div>}
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
