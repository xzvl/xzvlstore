"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { supabaseClient } from "@/lib/supabase-client";
import type { StoreProduct } from "@/lib/store-types";

type BindingLimit = { type: "stock" | "purchase"; remaining: number; cap: number };

function getBindingLimit(
  stock: number | undefined,
  maxLimit: number | null,
  currentInCart: number,
  isPreOrder: boolean
): BindingLimit | null {
  if (isPreOrder) return null;
  const candidates: BindingLimit[] = [];
  if (stock != null) candidates.push({ type: "stock", remaining: stock - currentInCart, cap: stock });
  if (maxLimit != null) candidates.push({ type: "purchase", remaining: maxLimit - currentInCart, cap: maxLimit });
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a.remaining <= b.remaining ? a : b));
}

export default function AddToCartButton({ product }: { product: StoreProduct }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasedInWindow, setPurchasedInWindow] = useState(0);
  const { addItem, items } = useCart();
  const router = useRouter();

  const stock = product.stock;
  const isPreOrder = product.pre_order;
  const rawLimit = product.max_purchase_enabled ? product.max_purchase_limit ?? null : null;

  // Fold in what this customer has already purchased of this product within
  // the rolling purchase-limit window, so the remaining allowance is accurate.
  useEffect(() => {
    if (rawLimit == null) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch(`/api/products/status?ids=${product.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data: { id: string; purchased_in_window: number }[] = await res.json();
        const match = data.find((p) => p.id === product.id);
        if (match && !cancelled) setPurchasedInWindow(match.purchased_in_window ?? 0);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [product.id, rawLimit]);

  const maxLimit = rawLimit != null ? Math.max(0, rawLimit - purchasedInWindow) : null;
  const currentInCart = items.find((i) => i.id === product.id)?.qty ?? 0;
  const binding = getBindingLimit(stock, maxLimit, currentInCart, isPreOrder);
  const remaining = binding?.remaining ?? null;

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  }

  function limitMessage(b: BindingLimit) {
    if (b.type === "purchase") {
      return b.remaining <= 0
        ? `Purchase limit reached — max ${b.cap} per customer`
        : `Max ${b.cap} per customer`;
    }
    return b.remaining <= 0 ? "No more stock available" : `Only ${b.cap} in stock`;
  }

  function handleIncrement() {
    if (binding != null && qty >= binding.remaining) {
      showError(limitMessage(binding));
      return;
    }
    setQty((q) => q + 1);
  }

  function handleAdd() {
    if (isPreOrder) {
      router.push(`/pre-order?product=${product.slug}`);
      return;
    }
    if (binding != null && currentInCart + qty > binding.cap) {
      showError(limitMessage(binding));
      return;
    }
    const ok = addItem(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        sale_price: product.sale_price,
        image: product.image,
        stock: stock,
        max_purchase_limit: maxLimit,
      },
      qty
    );
    if (!ok) {
      showError(binding ? limitMessage(binding) : "Unable to add to cart");
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const atStockLimit = remaining != null && currentInCart >= (binding?.cap ?? 0);

  if (product.status !== "active") {
    return (
      <div className="flex flex-col gap-3">
        <button
          disabled
          className="w-full py-4 font-mono text-[12px] tracking-[0.2em] uppercase bg-[#1a1a1a] border border-[#603e39]/50 text-[#e2e2e2]/30 cursor-not-allowed flex items-center justify-center gap-3"
        >
          <span className="material-symbols-outlined text-[18px]">block</span>
          Currently Unavailable
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Qty selector */}
      <div className="flex items-center gap-0">
        <span className="font-mono text-[10px] tracking-widest uppercase text-[#ebbbb4]/40 w-16">Qty</span>
        <div className="flex items-center border border-[#603e39]/50">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-[#e2e2e2]/50 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">remove</span>
          </button>
          <span className="w-10 text-center font-mono text-[14px] text-[#e2e2e2]">{qty}</span>
          <button
            onClick={handleIncrement}
            disabled={remaining != null && qty >= remaining}
            className="w-10 h-10 flex items-center justify-center text-[#e2e2e2]/50 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
      </div>

      {/* Purchase history note */}
      {purchasedInWindow > 0 && (
        <p className="font-mono text-[10px] text-[#ebbbb4]/40 tracking-wide">
          You&apos;ve purchased {purchasedInWindow} of this in the last 7 days.
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="font-mono text-[11px] text-red-400 tracking-wide">{error}</p>
      )}

      {/* Limit warning when cart already has max */}
      {!error && atStockLimit && binding && (
        <p className="font-mono text-[11px] text-[#ebbbb4]/50 tracking-wide">
          {binding.type === "purchase"
            ? `Purchase limit reached — max ${binding.cap} per customer`
            : `Max stock reached — ${binding.cap} already in cart`}
        </p>
      )}

      {/* Add to cart */}
      <button
        onClick={handleAdd}
        disabled={atStockLimit}
        className={`w-full py-4 font-mono text-[12px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed ${
          added
            ? "bg-[#1a1a1a] border border-primary text-primary"
            : "bg-primary text-white hover:brightness-110 active:scale-[0.98]"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">
          {added ? "check" : product.pre_order ? "schedule" : "shopping_cart"}
        </span>
        {added ? "Added to Cart!" : product.pre_order ? "Pre-Order" : "Add to Cart"}
      </button>
    </div>
  );
}
