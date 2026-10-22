import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  variantId: string;
  productSlug: string;
  name: string;
  color: string;
  price: number;
  image?: string;
  quantity: number;
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
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

  const add = (i: CartItem) =>
    setItems((prev) => {
      const f = prev.find((p) => p.variantId === i.variantId);
      if (f) return prev.map((p) => (p.variantId === i.variantId ? { ...p, quantity: Math.min(99, p.quantity + i.quantity) } : p));
      return [...prev, i];
    });
  const setQty = (id: string, q: number) =>
    setItems((prev) => prev.map((p) => (p.variantId === id ? { ...p, quantity: Math.max(1, Math.min(99, q)) } : p)));
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
