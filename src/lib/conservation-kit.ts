export const KIT_COUPON = "KITCONSERVACAO";
export type GiftItem = { name: string; quantity: number; unit: string };
export type KitState = {
  code: string;
  ready: boolean;
  gifts: GiftItem[];
  kilograms: number;
  kits: number;
};
export const EMPTY_KIT: KitState = { code: "", ready: true, gifts: [], kilograms: 0, kits: 0 };
export const normalizeKitCoupon = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
export function readGifts(value: unknown): GiftItem[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is GiftItem =>
          item &&
          typeof item.name === "string" &&
          typeof item.unit === "string" &&
          Number.isSafeInteger(item.quantity) &&
          item.quantity > 0,
      )
    : [];
}
