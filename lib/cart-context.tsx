"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  sale_price: number | null;
  image: string;
  qty: number;
  stock?: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => boolean;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("xzvl_cart");
      if (stored) {
        const parsed: CartItem[] = JSON.parse(stored);
        // Backfill slug for items stored before slug was added
        setItems(parsed.map((item) => ({
          ...item,
          slug: item.slug || item.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        })));
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("xzvl_cart", JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "qty">, qty = 1): boolean => {
    let accepted = true;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      const currentQty = existing?.qty ?? 0;
      if (item.stock != null && currentQty + qty > item.stock) {
        accepted = false;
        return prev;
      }
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: currentQty + qty, stock: item.stock ?? i.stock } : i
        );
      }
      return [...prev, { ...item, qty }];
    });
    return accepted;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback(
    (id: string, qty: number) => {
      if (qty <= 0) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        return;
      }
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          const cappedQty = i.stock != null ? Math.min(qty, i.stock) : qty;
          return { ...i, qty: cappedQty };
        })
      );
    },
    []
  );

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce(
    (sum, i) => sum + (i.sale_price ?? i.price) * i.qty,
    0
  );
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
