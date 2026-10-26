import { CreditCard, MessageCircle, Wallet } from "lucide-react";
import { brl } from "@/lib/store";
import { brazilPhone } from "@/lib/tracking";
import { useStoreSettings } from "@/components/site/StoreSettings";

export function PaymentPrice({ price, productName, prominent = false }: { price: number; productName?: string; prominent?: boolean }) {
  const { data: settings } = useStoreSettings();
  const whatsapp = brazilPhone(settings?.whatsapp ?? "");
  const message = productName
    ? `Olá! Quero simular o pagamento no cartão de crédito para ${productName}, anunciado por ${brl(price)} no Pix. Pode informar as opções de parcelamento, juros da maquineta e valor final?`
    : `Olá! Quero simular o pagamento no cartão de crédito na 3DFLEX. Pode informar as opções de parcelamento, juros da maquineta e valor final?`;
  return (
    <div className={prominent ? "rounded-2xl border border-primary/50 bg-card p-5 shadow-sm sm:p-6" : "space-y-1"}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Wallet className="size-4 text-primary" aria-hidden="true" /> Valor para pagamento no Pix</div>
      <div className={prominent ? "mt-2 font-display text-4xl font-extrabold tracking-tight text-primary sm:text-5xl" : "font-display text-xl font-extrabold text-foreground"}>{brl(price)}</div>
      <p className={prominent ? "mt-1 text-sm font-semibold text-foreground" : "text-xs font-semibold text-primary"}>Preço no Pix</p>
      {prominent && <>
        <div className="mt-5 border-t border-border pt-4">
          <p className="flex items-center gap-2 font-semibold text-foreground"><CreditCard className="size-5 text-primary" aria-hidden="true" /> Cartão de crédito</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">O pagamento no cartão está sujeito aos juros da maquineta. Consulte as parcelas, taxas e o valor total antes de confirmar a compra.</p>
          {whatsapp ? <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"><MessageCircle className="size-5" aria-hidden="true" /> Simular parcelamento no WhatsApp</a> : <p className="mt-3 text-xs text-muted-foreground">Para simular o parcelamento, consulte os canais de atendimento da loja.</p>}
        </div>
      </>}
    </div>
  );
}
