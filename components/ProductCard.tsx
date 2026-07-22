"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import type { StoreProduct } from "@/lib/store-types";

export default function ProductCard({ product }: { product: StoreProduct }) {
  const [adding, setAdding] = useState(false);
  const [stockLimited, setStockLimited] = useState(false);
  const { addItem, items } = useCart();
  const router = useRouter();

  const hoverImage = product.gallery_images[0];

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (product.pre_order) {
      router.push(`/pre-order?product=${product.slug}`);
      return;
    }
    const ok = addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      sale_price: product.sale_price,
      image: product.image,
      stock: product.stock,
      max_purchase_limit: product.max_purchase_enabled ? product.max_purchase_limit ?? null : null,
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
    <div className="group flex flex-col bg-[#1a1a1a] border border-[#603e39]/25 hover:border-primary/40 transition-all duration-200">
      {/* Image area */}
      <Link href={`/product/${product.slug}`} className="block relative aspect-square bg-[#131313] overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-contain bg-[#ffffff]"
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        {hoverImage && (
          <Image
            src={hoverImage}
            alt=""
            fill
            className="object-contain bg-[#ffffff] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        )}
        {product.pre_order && (
          <span className="absolute top-2 left-2 bg-primary px-2 py-0.5 font-mono text-[9px] text-white tracking-widest uppercase">
            Pre-Order
          </span>
        )}
        {product.sale_price && (
          <span className="absolute top-2 right-2 bg-[#1a1a1a] border border-primary/50 px-1.5 py-0.5 font-mono text-[9px] text-primary tracking-widest uppercase">
            Sale
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <Link href={`/product/${product.slug}`} className="block">
          <h3 className="font-inter font-bold text-[12px] leading-snug text-[#e2e2e2] line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-baseline gap-2 mt-auto">
          {product.sale_price ? (
            <>
              <span className="font-mono text-[14px] font-bold text-primary">
                ₱{product.sale_price.toLocaleString()}
              </span>
              <span className="font-mono text-[11px] text-[#e2e2e2]/30 line-through">
                ₱{product.price.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="font-mono text-[14px] text-[#e2e2e2]">
              ₱{product.price.toLocaleString()}
            </span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          className={`w-full py-2 font-mono text-[10px] tracking-widest uppercase transition-all ${
            stockLimited
              ? "bg-transparent border border-red-500/60 text-red-400"
              : adding
              ? "bg-primary text-white"
              : "bg-transparent border border-[#603e39]/50 text-[#e2e2e2]/60 hover:border-primary hover:text-primary"
          }`}
        >
          {stockLimited ? "Limit Reached" : adding ? "Added!" : product.pre_order ? "Pre-Order" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
