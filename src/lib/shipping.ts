export const FIXED_SHIPPING_BRL = 37.80;

export const FREE_PIX_SHIPPING_THRESHOLD_BRL = 600;
export function shippingForOrder(subtotal: number, paymentMethod: "pix" | "cartao" | "card"): number {
  return paymentMethod === "pix" && subtotal > FREE_PIX_SHIPPING_THRESHOLD_BRL ? 0 : FIXED_SHIPPING_BRL;
}
