import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/store";
import { FIXED_SHIPPING_BRL } from "@/lib/shipping";
import { cardWhatsAppUrl } from "@/lib/checkout";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Finalizar compra — 3DFLEX" }, { name: "description", content: "Confira seu pedido e informe os dados de entrega." }] }),
  component: Checkout,
});

type Payment = "pix" | "card";

function Checkout() {
  const { items, subtotal } = useCart();
  const [payment, setPayment] = useState<Payment>("pix");
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A cobrança só poderá ser iniciada após integração segura no servidor.
    const data = new FormData(event.currentTarget);
    setWhatsappUrl(payment === "card" ? cardWhatsAppUrl(items, subtotal, data) : null);
    setValidated(true);
  }

  if (!items.length) return <section className="container-x py-12"><h1 className="text-3xl font-bold">Finalizar compra</h1><p className="mt-4 text-muted-foreground">Seu carrinho está vazio.</p><Link className="mt-5 inline-block text-primary underline" to="/produtos">Explorar produtos</Link></section>;

  const fieldClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  return <section className="container-x py-10">
    <h1 className="text-3xl font-bold">Finalizar compra</h1>
    <p className="mt-2 text-sm text-muted-foreground">Confira seu pedido e preencha seus dados. Nenhum pagamento será cobrado nesta etapa.</p>
    <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form id="checkout-form" onSubmit={handleSubmit} onChange={() => { setValidated(false); setWhatsappUrl(null); }} className="space-y-6">
        <fieldset className="space-y-4 rounded-xl border border-border bg-card p-5">
          <legend className="px-2 font-bold">Seus dados</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">Nome completo<input name="name" required autoComplete="name" maxLength={120} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">E-mail<input name="email" required type="email" autoComplete="email" maxLength={160} className={fieldClass}/></label>
            <label className="space-y-1 text-sm">Telefone com DDD<input name="phone" required type="tel" autoComplete="tel" minLength={10} maxLength={20} className={fieldClass}/></label>
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
        <fieldset className="space-y-3 rounded-xl border border-border bg-card p-5">
          <legend className="px-2 font-bold">Forma de pagamento</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3"><input type="radio" name="payment" checked={payment === "pix"} onChange={() => {setPayment("pix"); setValidated(false);}} className="mt-1 accent-primary"/><span><strong>Pix — Blackcat</strong><span className="block text-xs text-muted-foreground">Integração de cobrança ainda não ativada.</span></span></label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3"><input type="radio" name="payment" checked={payment === "card"} onChange={() => {setPayment("card"); setValidated(false);}} className="mt-1 accent-primary"/><span><strong>Cartão de crédito — WhatsApp</strong><span className="block text-xs text-muted-foreground">{cardWhatsAppUrl() ? "Continue no WhatsApp para combinar o pagamento por cartão." : "Aguardando cadastro do número de atendimento."}</span></span></label>
        </fieldset>
        <button type="submit" className="w-full rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90">Conferir dados para pagamento</button>
        {validated && <p role="status" className="rounded-lg border border-border bg-card p-4 text-sm">Dados preenchidos e validados no navegador. {payment === "pix" ? "O Pix ainda não está disponível: aguardando integração segura com a Blackcat." : (whatsappUrl ? "Continue pelo WhatsApp para solicitar o pagamento por cartão." : "A finalização por cartão ainda não está disponível: aguardando configuração do WhatsApp.")} Nenhum pedido foi criado ou cobrado.</p>}
        {validated && whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg bg-primary px-5 py-3 text-center font-bold text-primary-foreground">Continuar no WhatsApp</a>}
      </form>
      <aside className="h-fit space-y-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">Resumo do pedido</h2>
        <ul className="space-y-3 text-sm">{items.map(item => <li key={item.variantId} className="flex justify-between gap-3"><span>{item.name} — {item.color} × {item.quantity}</span><span className="shrink-0">{brl(item.price * item.quantity)}</span></li>)}</ul>
        <div className="space-y-2 border-t border-border pt-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div><div className="flex justify-between"><span>Frete fixo</span><span>{brl(FIXED_SHIPPING_BRL)}</span></div><div className="flex justify-between border-t border-border pt-3 text-lg font-bold"><span>Total</span><span>{brl(subtotal + FIXED_SHIPPING_BRL)}</span></div></div>
        <Link to="/carrinho" className="inline-block text-sm text-primary underline">Voltar ao carrinho</Link>
      </aside>
    </div>
  </section>;
}
