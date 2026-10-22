import { describe, expect, it } from 'vitest';
import { addCartItem, clampQuantity, restoreCart } from '@/lib/cart-stock';
import type { CartItem } from '@/lib/cart';
const filament: CartItem = { variantId: 'white', productSlug: 'pla', name: 'Filamento PLA', color: 'Branco', price: 59.9, quantity: 1, stock: 1 };
describe('Stock limits', () => {
  it('caps repeated additions of the same color at one', () => {
    let cart: CartItem[] = [];
    for (let i = 0; i < 10; i++) cart = addCartItem(cart, filament);
    expect(cart).toEqual([filament]);
  });
  it('allows one of each distinct color', () => {
    expect(addCartItem([filament], { ...filament, variantId: 'black', color: 'Preto' })).toHaveLength(2);
  });
  it('caps manual quantity edits, including invalid numbers', () => {
    for (const q of [2, 99, -5, NaN, Infinity, 1.5]) expect(clampQuantity(filament, q)).toBe(1);
  });
  it('normalizes old saved carts and merges duplicate variants', () => {
    const { stock, ...old } = filament;
    expect(restoreCart([{ ...old, quantity: 99 }, old])).toEqual([{ ...old, quantity: 1 }]);
  });
  it('blocks sold out variants and honors accessory stock', () => {
    expect(addCartItem([], { ...filament, stock: 0 })).toEqual([]);
    expect(clampQuantity({ ...filament, name: 'Sílica', stock: 5 }, 9)).toBe(5);
  });
});
