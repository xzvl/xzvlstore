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
import { bundleCartPrices, parseBundleCartId } from "@/lib/bundle-types";

export type CartBundleItem = { product_id: string; name: string; qty: number; unit_price: number };

export type CartItem = {
  /** Product id, or `bundle:<id>` for a bundle line (see bundleCartId). */
  id: string;
  slug: string;
  name: string;
  /** For a bundle: the products' combined normal price. */
  price: number;
  /** For a bundle: the bundle price. */
  sale_price: number | null;
  image: string;
  qty: number;
  stock?: number;
  max_purchase_limit?: number | null;
  /** Set on bundle lines — the products one bundle contains. */
  bundle?: { id: string; items: CartBundleItem[] };
};

type FreshBundle = {
  id: string;
  name: string;
  status: "active" | "inactive";
  available: boolean;
  stock: number;
  price: number;
  regular_total: number;
  image: string | null;
  components: CartBundleItem[];
  max_purchase_limit: number | null;
  purchased_in_window: number;
};

type FreshProduct = {
  id: string;
  status: "active" | "inactive";
  sneak_peek?: boolean;
  bundle_only?: boolean;
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
  // Flakers can still check out but can't place orders on /pre-order.
  isFlaker: boolean;
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
  const [isFlaker, setIsFlaker] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkBlockedStatus() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        if (!cancelled) { setIsBlocked(false); setBlockReason(null); setIsFlaker(false); }
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
        setIsFlaker(!!data.is_flaker);
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
    let freshBundles: FreshBundle[] = [];
    try {
      const productIds = items.filter((i) => !i.bundle).map((i) => i.id);
      const bundleIds = items.map((i) => parseBundleCartId(i.id)).filter((id): id is string => !!id);
      const { data: { session } } = await supabaseClient.auth.getSession();
      const headers: HeadersInit = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      const [productRes, bundleRes] = await Promise.all([
        productIds.length
          ? fetch(`/api/products/status?ids=${encodeURIComponent(productIds.join(","))}`, { headers })
          : null,
        bundleIds.length
          ? fetch(`/api/bundles/status?ids=${encodeURIComponent(bundleIds.join(","))}`, { headers })
          : null,
      ]);
      if ((productRes && !productRes.ok) || (bundleRes && !bundleRes.ok)) return { changed: false, messages: [] };
      if (productRes) fresh = await productRes.json();
      if (bundleRes) freshBundles = await bundleRes.json();
    } catch {
      return { changed: false, messages: [] };
    }

    const freshMap = new Map(fresh.map((p) => [p.id, p]));
    const bundleMap = new Map(freshBundles.map((b) => [b.id, b]));
    const messages: string[] = [];
    let changed = false;

    setItems((prev) => {
      const next: CartItem[] = [];
      for (const item of prev) {
        const bundleId = parseBundleCartId(item.id);
        if (bundleId) {
          const b = bundleMap.get(bundleId);
          if (!b || b.status !== "active" || !b.available || b.stock <= 0) {
            messages.push(
              b && b.available && b.status === "active"
                ? `${item.name} is out of stock and was removed from your cart.`
                : `${item.name} is no longer available and was removed from your cart.`
            );
            changed = true;
            continue;
          }
          const bundleAllowance = b.max_purchase_limit != null
            ? Math.max(0, b.max_purchase_limit - b.purchased_in_window)
            : null;
          if (bundleAllowance === 0) {
            messages.push(`${item.name} was removed — you've reached its purchase limit for now.`);
            changed = true;
            continue;
          }
          const bundleCap = effectiveCap(b.stock, bundleAllowance)!;
          let qty = item.qty;
          if (qty > bundleCap) {
            qty = bundleCap;
            messages.push(`Quantity for ${item.name} was reduced to ${bundleCap} (maximum allowed).`);
            changed = true;
          }
          const prices = bundleCartPrices(b);
          if (prices.price !== item.price || prices.sale_price !== item.sale_price) {
            messages.push(`The price of ${b.name} was updated.`);
            changed = true;
          } else if (JSON.stringify(b.components) !== JSON.stringify(item.bundle?.items ?? [])) {
            messages.push(`The products in ${b.name} were updated.`);
            changed = true;
          }
          next.push({
            ...item,
            qty,
            name: b.name,
            ...prices,
            image: b.image || item.image,
            stock: b.stock,
            max_purchase_limit: bundleAllowance,
            bundle: { id: b.id, items: b.components },
          });
          continue;
        }

        const p = freshMap.get(item.id);
        if (!p || p.status !== "active" || p.sneak_peek) {
          messages.push(`${item.name} is no longer available and was removed from your cart.`);
          changed = true;
          continue;
        }
        if (p.bundle_only) {
          messages.push(`${item.name} is only available as part of a bundle and was removed from your cart.`);
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
      value={{ items, addItem, removeItem, updateQty, clearCart, total, count, revalidateCart, notice, dismissNotice, isBlocked, blockReason, isFlaker }}
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
