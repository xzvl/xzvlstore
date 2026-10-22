"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { bundleCartId, bundleCartPrices, bundleImage, bundlePurchaseLimit, percentOff, type ResolvedBundle } from "@/lib/bundle-types";
import { sizedImageUrl } from "@/lib/image-sizes";

const FALLBACK_IMAGE = "/assets/favicon.webp";

export default function BundleCard({ bundle }: { bundle: ResolvedBundle }) {
  const [adding, setAdding] = useState(false);
  const [stockLimited, setStockLimited] = useState(false);
  const { addItem, isBlocked } = useCart();

  const image = bundleImage(bundle);
  const { price, sale_price } = bundleCartPrices(bundle);
  const pay = sale_price ?? price;
  const savings = price - pay;
  const off = percentOff({ regular_total: price, discount: savings });

  function handleAddToCart() {
    if (isBlocked) return;
    const ok = addItem({
      id: bundleCartId(bundle.id),
      slug: "",
      name: bundle.name,
      price,
      sale_price,
      image: image ?? FALLBACK_IMAGE,
      stock: bundle.stock,
      max_purchase_limit: bundlePurchaseLimit(bundle),
      bundle: {
        id: bundle.id,
        items: bundle.components.map((c) => ({
          product_id: c.product_id, name: c.name, qty: c.qty, unit_price: c.unit_price,
        })),
      },
    });
    if (!ok) {
      setStockLimited(true);
      setTimeout(() => setStockLimited(false), 2000);
      return;
    }
    setAdding(true);
    setTimeout(() => setAdding(false), 1200);
  }

  return (
    <div className="group flex flex-col bg-panel border border-line/25 hover:border-primary/40 transition-all duration-200">
      {/* Image */}
      <div className="relative aspect-square bg-canvas overflow-hidden">
        {image ? (
          <Image
            src={sizedImageUrl(image, "medium") ?? image}
            alt={bundle.name}
            fill
            className="object-contain bg-[#ffffff]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={(e) => { if (e.currentTarget.src !== image) e.currentTarget.src = image; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-panel">
            <span className="material-symbols-outlined text-[48px] text-line/30">package_2</span>
          </div>
        )}
        <span className="absolute top-2 left-2 bg-primary px-2 py-0.5 font-mono text-[9px] text-white tracking-widest uppercase">
          Bundle
        </span>
        {off > 0 && (
          <span className="absolute top-2 right-2 bg-green-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white tracking-wider">
            −{off}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <h3 className="font-inter font-bold text-[13px] leading-snug text-fg line-clamp-2">{bundle.name}</h3>

        <ul className="space-y-0.5">
          {bundle.components.map((c) => (
            <li key={c.product_id} className="font-mono text-[10px] text-accent/60 truncate">
              <span className="text-fg/70">{c.qty}×</span> {c.name}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-[16px] font-bold text-primary">₱{pay.toLocaleString()}</span>
            {savings > 0 && (
              <span className="font-mono text-[11px] text-fg/30 line-through">₱{price.toLocaleString()}</span>
            )}
          </div>
          {savings > 0 && (
            <p className="font-mono text-[10px] text-green-500 tracking-wide">Save ₱{savings.toLocaleString()}</p>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          disabled={isBlocked}
          className={`w-full py-2 font-mono text-[10px] tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            stockLimited
              ? "bg-transparent border border-red-500/60 text-red-400"
              : adding
              ? "bg-primary text-white"
              : "bg-transparent border border-line/50 text-fg/60 hover:border-primary hover:text-primary"
          }`}
        >
          {isBlocked ? "Account Blocked" : stockLimited ? "Limit Reached" : adding ? "Added!" : "Add Bundle to Cart"}
        </button>
      </div>
    </div>
  );
}
