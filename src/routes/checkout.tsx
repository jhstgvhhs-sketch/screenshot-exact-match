import { CheckoutAuth } from "@/components/CheckoutAuth";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { reviewCheckoutItems } from "@/lib/checkout-review";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/store";
import { shippingForOrder, FREE_PIX_SHIPPING_THRESHOLD_BRL } from "@/lib/shipping";
import { cardWhatsAppUrl } from "@/lib/checkout";
import { supabase } from "@/integrations/supabase/client";
import { RecoveryConsent } from "@/components/RecoveryConsent";
import { captureRecoveryContact } from "@/lib/cart-recovery";
import { ConservationCoupon } from "@/components/ConservationCoupon";
import { OrderGifts } from "@/components/OrderGifts";
import { EMPTY_KIT } from "@/lib/conservation-kit";
import { PixQrCode } from "@/components/PixQrCode";
import { CheckoutAddress } from "@/components/CheckoutAddress";
import { PixPaymentStatus } from "@/components/PixPaymentStatus";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" },{ title: "Finalizar compra — 3DFLEX" }, { name: "description", content: "Confira seu pedido e informe os dados de entrega." }] }),
  component: Checkout,
});

type Payment = "pix" | "card";

export function Checkout() {
  const { items, subtotal, replace } = useCart();
  const [kit, setKit] = useState(EMPTY_KIT);
  const [payment, setPayment] = useState<Payment>("pix");
  const [cardShippingConfirmed, setCardShippingConfirmed] = useState(false);
  const [step, setStep] = useState<"details" | "payment">("details");
  const [deliveryData, setDeliveryData] = useState<FormData | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardOrderId, setCardOrderId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ copyPaste: string; qrCodeBase64?: string; orderId: string } | null>(null);

  async function beginPix() {
    if (!deliveryData || pixLoading || pixData || !kit.ready) return;
    setPixLoading(true);
    setPixError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Entre na sua conta para finalizar o pedido por Pix.");
      const review = await reviewCheckoutItems(items);
      if (review.changed) { replace(review.current); throw new Error("Os preços ou produtos disponíveis foram atualizados. Confira o resumo antes de continuar."); }
      const customer = Object.fromEntries(Array.from(deliveryData.entries()).map(([key, value]) => [key, String(value).trim()]));
      if (kit.code) customer.coupon_code = kit.code;
      const { data, error } = await supabase.functions.invoke("blackcat-create-pix", {
        body: { customer, items: items.map(item => ({ variant_id: item.variantId, quantity: item.quantity })) }
      });
      if (error) throw new Error("Não foi possível gerar o Pix agora. Consulte Meus Pedidos antes de tentar novamente.");
      if (!data || typeof data.copyPaste !== "string" || typeof data.orderId !== "string")
        throw new Error(data?.error || "Não foi possível gerar o Pix. Nenhuma cobrança foi confirmada.");
      setPixData({ copyPaste: data.copyPaste, qrCodeBase64: data.qrCodeBase64, orderId: data.orderId });
    } catch (error) {
      setPixError(error instanceof Error ? error.message : "Erro ao iniciar pagamento.");
    } finally { setPixLoading(false); }
  }

  async function beginCard() {
    if (!deliveryData || cardLoading || cardOrderId || !kit.ready) return;
    setCardLoading(true);
    setCardError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Entre na sua conta para registrar o pedido.");
      const review = await reviewCheckoutItems(items);
      if (review.changed) { replace(review.current); throw new Error("Os preços ou produtos disponíveis foram atualizados. Confira o resumo antes de continuar."); }
      const customer = Object.fromEntries(Array.from(deliveryData.entries()).map(([key, value]) => [key, String(value).trim()]));
      if (customer.email?.toLowerCase() !== user.email?.toLowerCase())
        throw new Error("Utilize no pedido o mesmo e-mail da sua conta.");
      // Read the current public store contact before creating the order, so ADM changes apply without a new build.
      const { data: storeContact, error: contactError } = await (supabase as unknown as { from: (table: string) => any })
        .from("store_settings").select("whatsapp").eq("id", "main").maybeSingle();
      if (contactError) throw new Error("Não foi possível consultar o WhatsApp da loja. Tente novamente.");
      const cardLink = cardWhatsAppUrl(items, subtotal, deliveryData, kit.gifts, storeContact?.whatsapp ?? undefined);
      if (!cardLink) throw new Error("O atendimento para cartão está indisponível. Consulte os canais de contato da loja ou escolha Pix.");
      const { data, error } = await supabase.rpc("place_order", {
        _items: items.map(item => ({ variant_id: item.variantId, quantity: item.quantity })),
        _customer: customer,
        _coupon: kit.code || null as unknown as string,
        _method: "cartao",
      });
      if (error) throw error;
      if (!data) throw new Error("O pedido não foi confirmado pelo banco.");
      setCardOrderId(data);
      setWhatsappUrl(cardLink);
      setValidated(true);
    } catch (error) {
      setCardError(error instanceof Error ? error.message : "Não foi possível registrar o pedido.");
    } finally {
      setCardLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setDeliveryData(data);
    setStep("payment");
    setValidated(false);
  }

  if (!items.length) return <section className="container-x py-12"><h1 className="text-3xl font-bold">Finalizar compra</h1><p className="mt-4 text-muted-foreground">Seu carrinho está vazio.</p><Link className="mt-5 inline-block text-primary underline" to="/produtos">Explorar produtos</Link></section>;

  const shipping = shippingForOrder(subtotal, payment === "pix" ? "pix" : "card");
  const fieldClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  return <section className="container-x py-10">
    <h1 className="text-3xl font-bold">{step === "details" ? "Dados de entrega" : "Pagamento"}</h1>
    <p className="mt-2 text-sm text-muted-foreground">{step === "details" ? "Etapa 1 de 2 — Informe seus dados para continuar ao pagamento." : "Etapa 2 de 2 — Escolha a forma de pagamento. Nenhuma cobrança será feita automaticamente."}</p>
    <nav aria-label="Etapas da compra" className="mt-6"><ol className="flex gap-3 text-sm">{["Dados de entrega", "Pagamento"].map((label, index) => <li key={label} aria-current={(step === "details" ? 0 : 1) === index ? "step" : undefined} className={`flex flex-1 items-center gap-2 rounded-lg border p-3 ${index === 0 || step === "payment" ? "border-primary/50 bg-primary/10" : "border-border text-muted-foreground"}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{index === 0 && step === "payment" ? "✓" : index + 1}</span>{label}</li>)}</ol></nav>
    <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form hidden={step !== "details"} id="checkout-form" onSubmit={handleSubmit} onChange={event => { setValidated(false); setWhatsappUrl(null); captureRecoveryContact(event.currentTarget); }} className="space-y-6">
        <fieldset className="space-y-4 rounded-xl border border-border bg-card p-5">
          <legend className="px-2 font-bold">Seus dados</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">Nome completo<input name="name" required autoComplete="name" maxLength={120} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">E-mail<input name="email" required type="email" autoComplete="email" maxLength={160} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">Telefone com DDD<input name="phone" required type="tel" autoComplete="tel" minLength={10} maxLength={20} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">CPF para emissão da cobrança<input name="cpf" required inputMode="numeric" autoComplete="off" pattern="[0-9]{11}" title="Digite os 11 números do CPF, sem pontos ou traços" maxLength={11} className={fieldClass}/></label>
          </div>
        </fieldset>
        <CheckoutAddress fieldClass={fieldClass} />
        <RecoveryConsent />
        <button type="submit" className="w-full rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90">Continuar para pagamento</button>
      </form><div hidden={step !== "payment"} className="space-y-6">
        <CheckoutAuth />
        <fieldset className="space-y-3 rounded-xl border border-border bg-card p-5">
          <legend className="px-2 font-bold">Escolha como pagar</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <input type="radio" name="payment" disabled={!!pixData || !!cardOrderId} checked={payment === "pix"} onChange={() => { setPayment("pix"); setCardShippingConfirmed(false); setValidated(false); }} className="mt-1 accent-primary" />
            <span><strong>Pix</strong><span className="block text-xs text-muted-foreground">Gere o código Pix e confira a confirmação do pagamento nesta página.</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <input type="radio" name="payment" disabled={!!pixData || !!cardOrderId} checked={payment === "card"} onChange={() => { setPayment("card"); setCardShippingConfirmed(false); setValidated(false); }} className="mt-1 accent-primary" />
            <span><strong>Cartão de crédito — WhatsApp</strong><span className="block text-xs text-muted-foreground">Continue pelo atendimento para combinar o pagamento.</span></span>
          </label>
        </fieldset>
        {payment === "card" && subtotal > FREE_PIX_SHIPPING_THRESHOLD_BRL && !cardShippingConfirmed && (
          <div role="alert" className="space-y-3 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
            <p className="text-base font-bold">Frete grátis no Pix! Não quer aproveitar?</p>
            <p className="text-muted-foreground">Você economiza {brl(shippingForOrder(subtotal, "card"))} escolhendo Pix. No cartão, o frete continua {brl(shippingForOrder(subtotal, "card"))}.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => { setPayment("pix"); setCardShippingConfirmed(false); setValidated(false); }} className="rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground">Quero frete grátis no Pix</button>
              <button type="button" onClick={() => setCardShippingConfirmed(true)} className="rounded-lg border border-input bg-background px-4 py-3 font-semibold text-foreground">Quero continuar no cartão mesmo</button>
            </div>
          </div>
        )}
        {payment === "card" && cardShippingConfirmed && subtotal > FREE_PIX_SHIPPING_THRESHOLD_BRL && <p className="text-xs text-muted-foreground">Você escolheu continuar no cartão com frete de {brl(shippingForOrder(subtotal, "card"))}. <button type="button" className="underline text-primary" onClick={() => setCardShippingConfirmed(false)}>Rever oferta Pix</button></p>}
        <button type="button" onClick={() => { if (payment === "pix") { void beginPix(); return; } if (subtotal > FREE_PIX_SHIPPING_THRESHOLD_BRL && !cardShippingConfirmed) { setCardShippingConfirmed(false); return; } void beginCard(); }} disabled={!kit.ready || pixLoading || cardLoading || !!pixData || (payment === "card" && !!cardOrderId) || (payment === "card" && subtotal > FREE_PIX_SHIPPING_THRESHOLD_BRL && !cardShippingConfirmed)} className="w-full rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{pixLoading ? "Preparando Pix..." : pixData ? "Pix já gerado" : cardLoading ? "Registrando pedido..." : cardOrderId && payment === "card" ? "Pedido registrado" : `Continuar com ${payment === "pix" ? "Pix" : "cartão"}` }</button>
        {cardError && payment === "card" && <p role="alert" className="rounded-lg border border-border bg-card p-4 text-sm">{cardError}</p>}
        {pixError && payment === "pix" && <p role="alert" className="rounded-lg border border-border bg-card p-4 text-sm">{pixError}</p>}
        {pixData && payment === "pix" && <div className="space-y-3 rounded-lg border border-border bg-card p-5"><h2 className="font-bold">Pagamento Pix — pedido {pixData.orderId}</h2><PixPaymentStatus orderId={pixData.orderId}><PixQrCode copyPaste={pixData.copyPaste} /><label className="block text-sm">Pix copia e cola<textarea className="mt-2 w-full rounded-lg border bg-background p-3" readOnly rows={3} value={pixData.copyPaste}/></label><button type="button" className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground" onClick={() => void navigator.clipboard.writeText(pixData.copyPaste)}>Copiar código Pix</button><p className="text-sm text-muted-foreground">Aguarde a confirmação do pagamento. Não faça um novo pedido enquanto este estiver pendente.</p></PixPaymentStatus></div>}
        {validated && <p role="status" className="rounded-lg border border-border bg-card p-4 text-sm">{whatsappUrl ? `Pedido ${cardOrderId?.slice(0,8).toUpperCase()} registrado como pagamento pendente. Continue no WhatsApp. A loja só marcará como pago após confirmação manual.` : "Pedido registrado como pagamento pendente. O atendimento por WhatsApp está indisponível; consulte os canais de contato da loja antes de tentar novamente."}</p>}
        {validated && whatsappUrl && payment === "card" && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg bg-primary px-5 py-3 text-center font-bold text-primary-foreground">Continuar no WhatsApp</a>}
        <button type="button" disabled={!!pixData || !!cardOrderId} onClick={() => { setStep("details"); setValidated(false); setWhatsappUrl(null); }} className="text-sm font-semibold text-primary underline">Voltar aos dados de entrega</button>
      </div>
      <aside className="order-first h-fit lg:order-none space-y-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">Resumo do pedido</h2>
        <ul className="space-y-3 text-sm">{items.map(item => <li key={item.variantId} className="flex justify-between gap-3"><span>{item.name} — {item.color} × {item.quantity}</span><span className="shrink-0">{brl(item.price * item.quantity)}</span></li>)}</ul>
        <ConservationCoupon items={items} disabled={pixLoading || cardLoading || !!pixData || !!cardOrderId} onChange={setKit}/>
        <OrderGifts value={kit.gifts}/>
        <p className="text-xs text-muted-foreground">Frete grátis acima de R$ 600,00 exclusivamente no Pix.</p><div className="space-y-2 border-t border-border pt-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div><div className="flex justify-between"><span>{shipping === 0 ? "Frete grátis no Pix" : "Frete fixo"}</span><span>{brl(shipping)}</span></div><div className="flex justify-between border-t border-border pt-3 text-lg font-bold"><span>Total</span><span>{brl(subtotal + shipping)}</span></div></div>
        <Link to="/carrinho" className="block rounded-lg border border-primary/40 px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-primary/10">Voltar ao carrinho</Link>
      </aside>
    </div>
  </section>;
}
