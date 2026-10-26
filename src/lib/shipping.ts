export const FIXED_SHIPPING_BRL = 37.8;

export const FREE_PIX_SHIPPING_THRESHOLD_BRL = 600;
type ShippingItem = { categorySlug?: string | null };
export function hasPrinter(items: readonly ShippingItem[]): boolean {
  return items.some((item) => item.categorySlug === "impressoras");
}
export function shippingForOrder(
  subtotal: number,
  paymentMethod: "pix" | "cartao" | "card",
  items: readonly ShippingItem[] = [],
): number {
  if (hasPrinter(items)) return 0;
  return paymentMethod === "pix" && subtotal > FREE_PIX_SHIPPING_THRESHOLD_BRL
    ? 0
    : FIXED_SHIPPING_BRL;
}
