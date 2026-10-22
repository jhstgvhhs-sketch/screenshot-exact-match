import type { CartItem } from './cart';

export function quantityLimit(item: CartItem): number {
  const stock = Math.max(0, Math.floor(item.stock ?? 99));
  return /filamento/i.test(item.name) ? Math.min(1, stock) : Math.min(99, stock);
}

export function clampQuantity(item: CartItem, quantity: number): number {
  const limit = quantityLimit(item);
  return limit === 0 ? 0 : Math.min(limit, Math.max(1, Number.isFinite(quantity) ? Math.floor(quantity) : 1));
}

export function addCartItem(items: CartItem[], item: CartItem): CartItem[] {
  const existing = items.find(i => i.variantId === item.variantId);
  const quantity = clampQuantity(item, (existing?.quantity ?? 0) + item.quantity);
  if (!quantity) return items.filter(i => i.variantId !== item.variantId);
  const next = { ...item, quantity };
  return existing ? items.map(i => i.variantId === item.variantId ? next : i) : [...items, next];
}

export function restoreCart(items: CartItem[]): CartItem[] {
  return items.reduce(addCartItem, [] as CartItem[]);
}
