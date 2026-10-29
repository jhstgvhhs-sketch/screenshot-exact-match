export const FIXED_SHIPPING_BRL = 37.8;
export const FREE_PIX_SHIPPING_THRESHOLD_BRL = 600;

export type ShippingSettings = {
  fixed_shipping_brl: number;
  free_pix_shipping_enabled: boolean;
  free_pix_shipping_threshold_brl: number;
};

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  fixed_shipping_brl: FIXED_SHIPPING_BRL,
  free_pix_shipping_enabled: true,
  free_pix_shipping_threshold_brl: FREE_PIX_SHIPPING_THRESHOLD_BRL,
};

type ShippingItem = { categorySlug?: string | null };

export function hasPrinter(items: readonly ShippingItem[]): boolean {
  return items.some((item) => item.categorySlug === "impressoras");
}

export function hasFreePixShipping(
  subtotal: number,
  items: readonly ShippingItem[] = [],
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS,
): boolean {
  return (
    !hasPrinter(items) &&
    settings.free_pix_shipping_enabled &&
    subtotal > settings.free_pix_shipping_threshold_brl
  );
}

export function shippingForOrder(
  subtotal: number,
  paymentMethod: "pix" | "cartao" | "card",
  items: readonly ShippingItem[] = [],
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS,
): number {
  if (hasPrinter(items)) return 0;
  if (paymentMethod === "pix" && hasFreePixShipping(subtotal, items, settings)) return 0;
  return settings.fixed_shipping_brl;
}
