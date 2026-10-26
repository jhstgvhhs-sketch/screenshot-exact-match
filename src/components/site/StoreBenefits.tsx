import { PixIcon } from "./PixIcon";
import { Link } from "@tanstack/react-router";
import { CreditCard, Truck, RotateCcw, ShieldCheck, Headphones } from "lucide-react";
const benefits = [
  {
    Icon: PixIcon,
    title: "Preço no Pix",
    text: "Valor anunciado para pagamento via Pix.",
    slug: "termos",
  },
  {
    Icon: CreditCard,
    title: "Cartão de crédito",
    text: "Parcelamento com juros da maquineta. Simulação pelo WhatsApp.",
    slug: "contato",
  },
  {
    Icon: Truck,
    title: "Envio para todo o Brasil",
    text: "Impressoras com frete grátis. Consulte as demais condições no checkout.",
    slug: "envio",
  },
  {
    Icon: RotateCcw,
    title: "Trocas e devoluções",
    text: "Consulte a política e os canais de atendimento.",
    slug: "trocas",
  },
  {
    Icon: ShieldCheck,
    title: "Pagamento e privacidade",
    text: "Conheça as informações sobre pagamento e proteção dos dados.",
    slug: "privacidade",
  },
];
export function StoreBenefits() {
  return (
    <section
      aria-label="Informações de compra"
      className="container-x my-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
    >
      {benefits.map(({ Icon, title, text, slug }) => (
        <Link
          key={slug}
          to="/info/$slug"
          params={{ slug }}
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
        >
          <Icon aria-hidden="true" className="mt-1 size-7 shrink-0 text-primary" />
          <div>
            <h2 className="text-sm font-bold">{title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
          </div>
        </Link>
      ))}
    </section>
  );
}
export function PurchaseSupport() {
  return (
    <div className="grid gap-3 border-t border-border pt-4 text-xs sm:grid-cols-3">
      {[
        {
          Icon: Truck,
          title: "Envio para todo o Brasil",
          text: "Consulte o rastreamento após a expedição.",
          slug: "envio",
        },
        {
          Icon: ShieldCheck,
          title: "Pagamento e dados",
          text: "Consulte as informações da plataforma.",
          slug: "privacidade",
        },
        {
          Icon: Headphones,
          title: "Suporte especializado",
          text: "Atendimento antes e depois da compra.",
          slug: "contato",
        },
      ].map(({ Icon, title, text, slug }) => (
        <Link
          key={slug}
          to="/info/$slug"
          params={{ slug }}
          className="flex items-start gap-2 hover:text-primary"
        >
          <Icon aria-hidden="true" className="size-6 shrink-0" />
          <span>
            <strong className="block">{title}</strong>
            <span className="mt-1 block leading-relaxed text-muted-foreground">{text}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
