import type { GiftItem } from "./conservation-kit";
import type { CartItem } from "./cart";
import { brl } from "./store";
import { FIXED_SHIPPING_BRL } from "./shipping";

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
  const message = [
    "Olá! Quero finalizar minha compra na 3DFLEX por cartão.",
    ...items.map(item => `${item.name} — ${item.color} × ${item.quantity}: ${brl(item.price * item.quantity)}`),
    ...gifts.map(gift => `Brinde: ${gift.quantity} ${gift.unit} de ${gift.name} — Grátis`),
    `Subtotal: ${brl(subtotal)}`,
    `Frete fixo: ${brl(FIXED_SHIPPING_BRL)}`,
    `Total: ${brl(subtotal + FIXED_SHIPPING_BRL)}`,
    `Nome: ${field("name")}`,
    `E-mail: ${field("email")}`,
    `Telefone: ${field("phone")}`,
    `Entrega: ${field("street")}, ${field("number")} ${field("complement")} — ${field("district")}, ${field("city")}/${field("state")} — CEP ${field("cep")}`,
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
