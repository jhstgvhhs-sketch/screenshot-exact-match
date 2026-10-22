import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/store";
import { FIXED_SHIPPING_BRL } from "@/lib/shipping";
import { cardWhatsAppUrl } from "@/lib/checkout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Finalizar compra — 3DFLEX" }, { name: "description", content: "Confira seu pedido e informe os dados de entrega." }] }),
  component: Checkout,
});

type Payment = "pix" | "card";

function Checkout() {
  const { items, subtotal } = useCart();
  const [payment, setPayment] = useState<Payment>("pix");
  const [step, setStep] = useState<"details" | "payment">("details");
  const [deliveryData, setDeliveryData] = useState<FormData | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ copyPaste: string; qrCodeBase64?: string; orderId: string } | null>(null);

  async function beginPix() {
    if (!deliveryData || pixLoading || pixData) return;
    setPixLoading(true);
    setPixError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Entre na sua conta para finalizar o pedido por Pix.");
      const customer = Object.fromEntries(Array.from(deliveryData.entries()).map(([key, value]) => [key, String(value).trim()]));
      const { data, error } = await supabase.functions.invoke("blackcat-create-pix", {
        body: { customer, items: items.map(item => ({ variant_id: item.variantId, quantity: item.quantity })) }
      });
      if (error) throw new Error(error.message || "Pix indisponível no momento.");
      if (!data || typeof data.copyPaste !== "string" || typeof data.orderId !== "string")
        throw new Error(data?.error || "Não foi possível gerar o Pix. Nenhuma cobrança foi confirmada.");
      setPixData({ copyPaste: data.copyPaste, qrCodeBase64: data.qrCodeBase64, orderId: data.orderId });
    } catch (error) {
      setPixError(error instanceof Error ? error.message : "Erro ao iniciar pagamento.");
    } finally { setPixLoading(false); }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A cobrança só poderá ser iniciada após integração segura no servidor.
    const data = new FormData(event.currentTarget);
    setDeliveryData(data);
    setStep("payment");
    setValidated(false);
  }

  if (!items.length) return <section className="container-x py-12"><h1 className="text-3xl font-bold">Finalizar compra</h1><p className="mt-4 text-muted-foreground">Seu carrinho está vazio.</p><Link className="mt-5 inline-block text-primary underline" to="/produtos">Explorar produtos</Link></section>;

  const fieldClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  return <section className="container-x py-10">
    <h1 className="text-3xl font-bold">{step === "details" ? "Dados de entrega" : "Pagamento"}</h1>
    <p className="mt-2 text-sm text-muted-foreground">{step === "details" ? "Etapa 1 de 2 — Informe seus dados para continuar ao pagamento." : "Etapa 2 de 2 — Escolha a forma de pagamento. Nenhuma cobrança será feita automaticamente."}</p>
    <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
      {step === "details" ? <form id="checkout-form" onSubmit={handleSubmit} onChange={() => { setValidated(false); setWhatsappUrl(null); }} className="space-y-6">
        <fieldset className="space-y-4 rounded-xl border border-border bg-card p-5">
          <legend className="px-2 font-bold">Seus dados</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">Nome completo<input name="name" required autoComplete="name" maxLength={120} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">E-mail<input name="email" required type="email" autoComplete="email" maxLength={160} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">Telefone com DDD<input name="phone" required type="tel" autoComplete="tel" minLength={10} maxLength={20} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">CPF para emissão da cobrança<input name="cpf" required inputMode="numeric" autoComplete="off" pattern="[0-9]{11}" title="Digite os 11 números do CPF, sem pontos ou traços" maxLength={11} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">CEP<input name="cep" required inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}-?[0-9]{3}" title="Digite 8 números, com ou sem hífen" className={fieldClass}/></label>
          </div>
        </fieldset>
        <fieldset className="space-y-4 rounded-xl border border-border bg-card p-5">
          <legend className="px-2 font-bold">Endereço de entrega</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">Rua / Avenida<input name="street" required autoComplete="address-line1" maxLength={160} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">Número<input name="number" required maxLength={20} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">Complemento (opcional)<input name="complement" autoComplete="address-line2" maxLength={100} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">Bairro<input name="district" required maxLength={100} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">Cidade<input name="city" required autoComplete="address-level2" maxLength={100} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">Estado (UF)<input name="state" required autoComplete="address-level1" pattern="[A-Za-z]{2}" title="Informe a sigla do estado com 2 letras" maxLength={2} className={fieldClass}/></label>
          </div>
        </fieldset>
        <button type="submit" className="w-full rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90">Continuar para pagamento</button>
      </form> : <div className="space-y-6">
        <fieldset className="space-y-3 rounded-xl border border-border bg-card p-5">
          <legend className="px-2 font-bold">Escolha como pagar</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <input type="radio" name="payment" checked={payment === "pix"} onChange={() => { setPayment("pix"); setValidated(false); }} className="mt-1 accent-primary" />
            <span><strong>Pix</strong><span className="block text-xs text-muted-foreground">Pagamento instantâneo. Disponível após a validação segura do gateway.</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <input type="radio" name="payment" checked={payment === "card"} onChange={() => { setPayment("card"); setValidated(false); }} className="mt-1 accent-primary" />
            <span><strong>Cartão de crédito — WhatsApp</strong><span className="block text-xs text-muted-foreground">Continue pelo atendimento para combinar o pagamento.</span></span>
          </label>
        </fieldset>
        <button type="button" onClick={() => { if (payment === "pix") { void beginPix(); return; } setWhatsappUrl(deliveryData ? cardWhatsAppUrl(items, subtotal, deliveryData) : null); setValidated(true); }} className="w-full rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground">{pixLoading ? "Preparando Pix..." : `Continuar com ${payment === "pix" ? "Pix" : "cartão"}`}</button>
        {pixError && payment === "pix" && <p role="alert" className="rounded-lg border border-border bg-card p-4 text-sm">{pixError}</p>}
        {pixData && payment === "pix" && <div className="space-y-3 rounded-lg border border-border bg-card p-5"><h2 className="font-bold">Pagamento Pix — pedido {pixData.orderId}</h2>{pixData.qrCodeBase64 && <img className="mx-auto h-56 w-56 object-contain" alt="QR Code Pix" src={pixData.qrCodeBase64.startsWith("data:") ? pixData.qrCodeBase64 : `data:image/png;base64,${pixData.qrCodeBase64}`} />}<label className="block text-sm">Pix copia e cola<textarea className="mt-2 w-full rounded-lg border bg-background p-3" readOnly rows={3} value={pixData.copyPaste}/></label><button type="button" className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground" onClick={() => void navigator.clipboard.writeText(pixData.copyPaste)}>Copiar código Pix</button><p className="text-sm text-muted-foreground">Aguarde a confirmação do pagamento. Não faça um novo pedido enquanto este estiver pendente.</p></div>}
        {validated && <p role="status" className="rounded-lg border border-border bg-card p-4 text-sm">{payment === "pix" ? "O Pix ainda não está disponível para cobrança online. Nenhum pedido foi criado ou cobrado." : whatsappUrl ? "Continue pelo WhatsApp para solicitar o pagamento por cartão. Nenhum pedido foi criado ou cobrado." : "Atendimento por WhatsApp ainda não configurado. Nenhum pedido foi criado ou cobrado."}</p>}
        {validated && whatsappUrl && payment === "card" && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg bg-primary px-5 py-3 text-center font-bold text-primary-foreground">Continuar no WhatsApp</a>}
        <button type="button" onClick={() => { setStep("details"); setValidated(false); setWhatsappUrl(null); }} className="text-sm font-semibold text-primary underline">Voltar aos dados de entrega</button>
      </div>}
      <aside className="h-fit space-y-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">Resumo do pedido</h2>
        <ul className="space-y-3 text-sm">{items.map(item => <li key={item.variantId} className="flex justify-between gap-3"><span>{item.name} — {item.color} × {item.quantity}</span><span className="shrink-0">{brl(item.price * item.quantity)}</span></li>)}</ul>
        <div className="space-y-2 border-t border-border pt-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div><div className="flex justify-between"><span>Frete fixo</span><span>{brl(FIXED_SHIPPING_BRL)}</span></div><div className="flex justify-between border-t border-border pt-3 text-lg font-bold"><span>Total</span><span>{brl(subtotal + FIXED_SHIPPING_BRL)}</span></div></div>
        <Link to="/carrinho" className="inline-block text-sm text-primary underline">Voltar ao carrinho</Link>
      </aside>
    </div>
  </section>;
}
