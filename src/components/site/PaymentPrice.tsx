import { CreditCard, MessageCircle, Info } from "lucide-react";
import { PixIcon } from "./PixIcon";
import { brl } from "@/lib/store";
import { brazilPhone } from "@/lib/tracking";
import { useStoreSettings } from "@/components/site/StoreSettings";

export function PaymentPrice({
  price,
  productName,
  prominent = false,
}: {
  price: number;
  productName?: string;
  prominent?: boolean;
}) {
  const { data: settings } = useStoreSettings();
  const whatsapp = brazilPhone(settings?.whatsapp ?? "");
  const message = `Olá! Tenho interesse ${productName ? `no produto ${productName}, anunciado por ${brl(price)} no Pix` : "nos produtos da 3DFLEX"}. Gostaria de simular o parcelamento no cartão de crédito com os juros da maquineta.`;
  if (!prominent)
    return (
      <div>
        <p className="font-display text-xl font-extrabold text-primary">
          {brl(price)}{" "}
          <span className="font-sans text-xs font-semibold text-foreground">no Pix</span>
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Cartão com juros da maquineta.
        </p>
      </div>
    );
  return (
    <div className="space-y-2">
      <div className="grid overflow-hidden rounded-xl border border-primary/40 bg-background sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div className="flex min-w-0 items-center gap-3 p-4">
          <PixIcon aria-hidden="true" className="size-9 shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <p className="font-display text-3xl font-extrabold tracking-tight text-primary xl:text-4xl">
              {brl(price)}
            </p>
            <p className="text-lg font-bold">no PIX</p>
          </div>
        </div>
        <div className="min-w-0 border-t border-border p-4 sm:border-l sm:border-t-0 lg:border-l-0 lg:border-t xl:border-l xl:border-t-0">
          <p className="flex items-center gap-2 text-sm font-bold">
            <CreditCard className="size-5 shrink-0" aria-hidden="true" />
            Cartão de crédito
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Parcelamento com juros da maquineta.
          </p>
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-3 py-2 text-center text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
              Simular no WhatsApp
            </a>
          ) : (
            <a
              href="/info/contato"
              className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-primary underline"
            >
              Consultar atendimento
            </a>
          )}
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          <strong className="text-foreground">
            O preço exibido é o valor para pagamento via Pix.
          </strong>{" "}
          No cartão de crédito, o parcelamento está sujeito aos juros da maquineta. Consulte as
          condições e o valor final pelo WhatsApp.
        </p>
      </div>
    </div>
  );
}
