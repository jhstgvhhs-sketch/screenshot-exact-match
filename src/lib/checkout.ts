import type { GiftItem } from "./conservation-kit";
import type { CartItem } from "./cart";
import { brl } from "./store";
import { hasPrinter, shippingForOrder } from "./shipping";

// Public contact number only. Blackcat credentials must never be configured here.
export function normalizeCheckoutWhatsApp(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const phone = /^\d{10,11}$/.test(digits) ? `55${digits}` : digits;
  return /^55\d{10,11}$/.test(phone) ? phone : null;
}

export function cardWhatsAppUrl(items: CartItem[] = [], subtotal = 0, data?: FormData, gifts: GiftItem[] = [], configuredPhone?: string): string | null {
  const phone = normalizeCheckoutWhatsApp(configuredPhone ?? (import.meta.env["VITE_CHECKOUT_WHATSAPP_NUMBER"] ?? ""));
  if (!phone) return null;
  const field = (name: string) => String(data?.get(name) ?? "").trim();
  const shipping = shippingForOrder(subtotal, "card", items);
  const message = [
    "Olá! Quero finalizar minha compra na 3DFLEX por cartão.",
    ...items.map(item => `${item.name} — ${item.color} × ${item.quantity}: ${brl(item.price * item.quantity)}`),
    ...gifts.map(gift => `Brinde: ${gift.quantity} ${gift.unit} de ${gift.name} — Grátis`),
    `Subtotal: ${brl(subtotal)}`,
    shipping === 0 ? "Frete: Grátis (compra com impressora)" : `Frete fixo: ${brl(shipping)}`,
    `Total: ${brl(subtotal + shipping)}`,
    ...(hasPrinter(items) ? ["Condição de cartão: compra com impressora, até 10x sem juros (consulte a loja)."] : ["Condição de cartão: parcelamento sujeito aos juros da maquineta; confirme o valor com a loja."]),
    `Nome: ${field("name")}`,
    `E-mail: ${field("email")}`,
    `Telefone: ${field("phone")}`,
    `Entrega: ${field("street")}, ${field("number")} ${field("complement")} — ${field("district")}, ${field("city")}/${field("state")} — CEP ${field("cep")}`,
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
