"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { StoreProduct } from "@/lib/store-types";

export default function AddToCartButton({ product }: { product: StoreProduct }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  function handleAdd() {
    addItem(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        sale_price: product.sale_price,
        image: product.image,
      },
      qty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
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
            onClick={() => setQty((q) => q + 1)}
            className="w-10 h-10 flex items-center justify-center text-[#e2e2e2]/50 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
      </div>

      {/* Add to cart */}
      <button
        onClick={handleAdd}
        className={`w-full py-4 font-mono text-[12px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 ${
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
