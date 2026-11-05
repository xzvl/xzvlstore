"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { supabaseClient } from "@/lib/supabase-client";
import {
  bundleCartId,
  bundleCartPrices,
  bundleImage,
  bundlePurchaseLimit,
  type ResolvedBundle,
} from "@/lib/bundle-types";

const FALLBACK_IMAGE = "/assets/favicon.webp";

type BindingLimit = { type: "stock" | "purchase"; remaining: number; cap: number };

function getBindingLimit(stock: number, maxLimit: number | null, inCart: number): BindingLimit {
  const candidates: BindingLimit[] = [{ type: "stock", remaining: stock - inCart, cap: stock }];
  if (maxLimit != null) candidates.push({ type: "purchase", remaining: maxLimit - inCart, cap: maxLimit });
  return candidates.reduce((a, b) => (a.remaining <= b.remaining ? a : b));
}

export default function BundleAddToCartButton({ bundle }: { bundle: ResolvedBundle }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasedInWindow, setPurchasedInWindow] = useState(0);
  const { addItem, items, isBlocked } = useCart();

  const rawLimit = bundlePurchaseLimit(bundle);
  const purchasable = bundle.status === "active" && bundle.available && bundle.stock > 0;

  // Fold in what this customer already bought of this bundle in the rolling window.
  useEffect(() => {
    if (rawLimit == null) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch(`/api/bundles/status?ids=${bundle.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data: { id: string; purchased_in_window: number }[] = await res.json();
        const match = data.find((b) => b.id === bundle.id);
        if (match && !cancelled) setPurchasedInWindow(match.purchased_in_window ?? 0);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [bundle.id, rawLimit]);

  const maxLimit = rawLimit != null ? Math.max(0, rawLimit - purchasedInWindow) : null;
  const cartId = bundleCartId(bundle.id);
  const currentInCart = items.find((i) => i.id === cartId)?.qty ?? 0;
  const binding = getBindingLimit(bundle.stock, maxLimit, currentInCart);
  const atLimit = binding.remaining <= 0;

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
    if (qty >= binding.remaining) {
      showError(limitMessage(binding));
      return;
    }
    setQty((q) => q + 1);
  }

  function handleAdd() {
    if (currentInCart + qty > binding.cap) {
      showError(limitMessage(binding));
      return;
    }
    const { price, sale_price } = bundleCartPrices(bundle);
    const ok = addItem(
      {
        id: cartId,
        slug: "",
        name: bundle.name,
        price,
        sale_price,
        image: bundleImage(bundle) ?? FALLBACK_IMAGE,
        stock: bundle.stock,
        max_purchase_limit: maxLimit,
        bundle: {
          id: bundle.id,
          items: bundle.components.map((c) => ({
            product_id: c.product_id, name: c.name, qty: c.qty, unit_price: c.unit_price,
          })),
        },
      },
      qty
    );
    if (!ok) {
      showError(limitMessage(binding));
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (!purchasable || isBlocked) {
    return (
      <button
        disabled
        className={`w-full py-4 font-mono text-[12px] tracking-[0.2em] uppercase bg-panel border cursor-not-allowed flex items-center justify-center gap-3 ${
          isBlocked ? "border-red-500/40 text-red-400/70" : "border-line/50 text-fg/30"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">{isBlocked ? "gpp_bad" : "block"}</span>
        {isBlocked ? "Account Blocked" : "Currently Unavailable"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Qty selector */}
      <div className="flex items-center gap-0">
        <span className="font-mono text-[10px] tracking-widest uppercase text-accent/40 w-16">Qty</span>
        <div className="flex items-center border border-line/50">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-fg/50 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">remove</span>
          </button>
          <span className="w-10 text-center font-mono text-[14px] text-fg">{qty}</span>
          <button
            onClick={handleIncrement}
            disabled={qty >= binding.remaining}
            className="w-10 h-10 flex items-center justify-center text-fg/50 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
        {rawLimit != null && (
          <span className="ml-4 font-mono text-[10px] tracking-wide text-accent/50">
            Limit {rawLimit} per customer
          </span>
        )}
      </div>

      {purchasedInWindow > 0 && (
        <p className="font-mono text-[10px] text-accent/40 tracking-wide">
          You&apos;ve purchased {purchasedInWindow} of this bundle in the last 7 days.
        </p>
      )}

      {error && <p className="font-mono text-[11px] text-red-400 tracking-wide">{error}</p>}

      {!error && atLimit && (
        <p className="font-mono text-[11px] text-accent/50 tracking-wide">
          {binding.type === "purchase"
            ? `Purchase limit reached — max ${binding.cap} per customer`
            : `Max stock reached — ${binding.cap} already in cart`}
        </p>
      )}

      <button
        onClick={handleAdd}
        disabled={atLimit}
        className={`w-full py-4 font-mono text-[12px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed ${
          added
            ? "bg-panel border border-primary text-primary"
            : "bg-primary text-white hover:brightness-110 active:scale-[0.98]"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">{added ? "check" : "shopping_cart"}</span>
        {added ? "Added to Cart!" : "Add Bundle to Cart"}
      </button>
    </div>
  );
}
