import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { addCartItem, clampQuantity, restoreCart } from "./cart-stock";
import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  variantId: string;
  productSlug: string;
  name: string;
  color: string;
  price: number;
  image?: string;
  quantity: number;
  stock?: number;
};

type Ctx = {
  items: CartItem[];
  add: (i: CartItem) => void;
  setQty: (variantId: string, q: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "3dflex-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) setItems(restoreCart(saved));
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

  // Recheck current stock for saved carts and when returning from another tab.
  useEffect(() => {
    let active = true;
    async function refreshStock() {
      const { data, error } = await supabase.from("product_variants").select("id, stock");
      if (!active || error || !data) return;
      const stock = new Map(data.map(v => [v.id, v.stock]));
      setItems(prev => restoreCart(prev.filter(i => stock.has(i.variantId)).map(i => ({ ...i, stock: stock.get(i.variantId)! }))));
    }
    if (loaded) void refreshStock();
    const refresh = () => { void refreshStock(); };
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, [loaded]);

  const add = (i: CartItem) => setItems(prev => addCartItem(prev, i));
  const setQty = (id: string, q: number) =>
    setItems(prev => prev.map(p => p.variantId === id ? { ...p, quantity: clampQuantity(p, q) } : p).filter(p => p.quantity > 0));
  const remove = (id: string) => setItems((prev) => prev.filter((p) => p.variantId !== id));
  const clear = () => setItems([]);

  return (
    <CartCtx.Provider
      value={{
        items, add, setQty, remove, clear,
        count: items.reduce((a, b) => a + b.quantity, 0),
        subtotal: items.reduce((a, b) => a + b.price * b.quantity, 0),
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart fora do CartProvider");
  return c;
}
