"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabaseClient } from "@/lib/supabase-client";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  sale_price: number | null;
  image: string;
  qty: number;
  stock?: number;
  max_purchase_limit?: number | null;
};

type FreshProduct = {
  id: string;
  status: "active" | "inactive";
  stock: number;
  max_purchase_enabled: boolean;
  max_purchase_limit: number | null;
  purchased_in_window: number;
};

// The lowest of stock and per-customer purchase limit — null means unlimited.
function effectiveCap(stock?: number, maxPurchaseLimit?: number | null): number | null {
  const candidates = [stock, maxPurchaseLimit ?? undefined].filter(
    (n): n is number => n != null
  );
  return candidates.length ? Math.min(...candidates) : null;
}

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => boolean;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
  // Re-checks cart contents against live product data (status, stock, purchase
  // limit). Removes items that are inactive/deleted/out of stock and clamps
  // quantities down to the current stock / purchase limit. Returns whether
  // anything changed, so callers (e.g. checkout) can block proceeding.
  revalidateCart: () => Promise<{ changed: boolean; messages: string[] }>;
  notice: string[] | null;
  dismissNotice: () => void;
  // Whether the signed-in customer's account is blocked by an admin. Guests
  // (no session) are never blocked. Checked once on mount and re-checked on
  // any auth state change (sign in/out) so it stays accurate without reload.
  isBlocked: boolean;
  blockReason: string | null;
};

const CartContext = createContext<CartContextType | null>(null);

function CartNotice({ messages, onDismiss }: { messages: string[]; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-[calc(100vw-2rem)] max-w-sm bg-[#1a1a1a] border border-primary/50 shadow-xl shadow-black/40 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">info</span>
          <p className="font-mono text-[10px] tracking-widest uppercase text-primary">Cart Updated</p>
        </div>
        <button onClick={onDismiss} className="text-[#ebbbb4]/40 hover:text-primary transition-colors flex-shrink-0">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
      <ul className="space-y-1">
        {messages.map((m, i) => (
          <li key={i} className="font-mono text-[11px] text-[#e2e2e2]/70">{m}</li>
        ))}
      </ul>
    </div>
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<string[] | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkBlockedStatus() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        if (!cancelled) { setIsBlocked(false); setBlockReason(null); }
        return;
      }
      try {
        const res = await fetch("/api/account/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setIsBlocked(!!data.is_blocked);
        setBlockReason(data.block_reason || null);
      } catch {}
    }

    checkBlockedStatus();
    const { data: sub } = supabaseClient.auth.onAuthStateChange(checkBlockedStatus);
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

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
    if (isBlocked) return false;
    let accepted = true;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      const currentQty = existing?.qty ?? 0;
      const cap = effectiveCap(item.stock, item.max_purchase_limit);
      if (cap != null && currentQty + qty > cap) {
        accepted = false;
        return prev;
      }
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                qty: currentQty + qty,
                stock: item.stock ?? i.stock,
                max_purchase_limit: item.max_purchase_limit ?? i.max_purchase_limit,
              }
            : i
        );
      }
      return [...prev, { ...item, qty }];
    });
    return accepted;
  }, [isBlocked]);

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
          const cap = effectiveCap(i.stock, i.max_purchase_limit);
          const cappedQty = cap != null ? Math.min(qty, cap) : qty;
          return { ...i, qty: cappedQty };
        })
      );
    },
    []
  );

  const clearCart = useCallback(() => setItems([]), []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const revalidateCart = useCallback(async (): Promise<{ changed: boolean; messages: string[] }> => {
    if (items.length === 0) return { changed: false, messages: [] };

    let fresh: FreshProduct[] = [];
    try {
      const ids = items.map((i) => i.id).join(",");
      const { data: { session } } = await supabaseClient.auth.getSession();
      const headers: HeadersInit = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      const res = await fetch(`/api/products/status?ids=${encodeURIComponent(ids)}`, { headers });
      if (!res.ok) return { changed: false, messages: [] };
      fresh = await res.json();
    } catch {
      return { changed: false, messages: [] };
    }

    const freshMap = new Map(fresh.map((p) => [p.id, p]));
    const messages: string[] = [];
    let changed = false;

    setItems((prev) => {
      const next: CartItem[] = [];
      for (const item of prev) {
        const p = freshMap.get(item.id);
        if (!p || p.status !== "active") {
          messages.push(`${item.name} is no longer available and was removed from your cart.`);
          changed = true;
          continue;
        }
        // Remaining purchase allowance = configured limit minus what this
        // customer already bought in the rolling 7-day window.
        const purchaseAllowance = p.max_purchase_enabled
          ? Math.max(0, (p.max_purchase_limit ?? Infinity) - p.purchased_in_window)
          : null;
        const cap = effectiveCap(p.stock, purchaseAllowance);
        if (cap != null && cap <= 0) {
          messages.push(
            purchaseAllowance === 0
              ? `${item.name} was removed — you've reached its purchase limit for now.`
              : `${item.name} is out of stock and was removed from your cart.`
          );
          changed = true;
          continue;
        }
        let qty = item.qty;
        if (cap != null && qty > cap) {
          qty = cap;
          messages.push(`Quantity for ${item.name} was reduced to ${cap} (maximum allowed).`);
          changed = true;
        }
        next.push({
          ...item,
          qty,
          stock: p.stock,
          max_purchase_limit: purchaseAllowance,
        });
      }
      return next;
    });

    if (messages.length) setNotice(messages);
    return { changed, messages };
  }, [items]);

  const total = items.reduce(
    (sum, i) => sum + (i.sale_price ?? i.price) * i.qty,
    0
  );
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, total, count, revalidateCart, notice, dismissNotice, isBlocked, blockReason }}
    >
      {children}
      {notice && notice.length > 0 && <CartNotice messages={notice} onDismiss={dismissNotice} />}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
