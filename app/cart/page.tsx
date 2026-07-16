"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CartPage() {
  const { items, removeItem, updateQty, total, count, revalidateCart } = useCart();

  useEffect(() => {
    revalidateCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      <main className="bg-[#131313] min-h-screen">
        <div className="max-w-[1440px] mx-auto px-4 md:px-16 py-12">
          {/* Page title */}
          <div className="mb-10">
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-1.5">
              // Shopping Cart
            </p>
            <h1 className="font-inter font-black text-[32px] md:text-[40px] uppercase leading-none text-[#e2e2e2]">
              Your Cart
              {count > 0 && (
                <span className="text-[#ebbbb4]/30 text-[0.6em] ml-4">
                  ({count} {count === 1 ? "item" : "items"})
                </span>
              )}
            </h1>
          </div>

          {items.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Items */}
              <div className="lg:col-span-2 space-y-3">
                {items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onQtyChange={(qty) => updateQty(item.id, qty)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <OrderSummary total={total} count={count} />
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="material-symbols-outlined text-[64px] text-[#603e39]/40 mb-6">
        shopping_cart
      </span>
      <p className="font-inter font-bold text-[20px] text-[#e2e2e2]/60 mb-2 uppercase">
        Your cart is empty
      </p>
      <p className="font-mono text-[12px] text-[#ebbbb4]/30 mb-8">
        Add some products to get started.
      </p>
      <Link
        href="/collection/new-releases"
        className="inline-flex items-center gap-3 px-8 py-3 bg-primary text-white font-mono text-[11px] tracking-[0.2em] uppercase hover:brightness-110 transition-all"
      >
        <span className="material-symbols-outlined text-[16px]">storefront</span>
        Browse Products
      </Link>
    </div>
  );
}

function CartItem({
  item,
  onQtyChange,
  onRemove,
}: {
  item: { id: string; slug: string; name: string; price: number; sale_price: number | null; image: string; qty: number; stock?: number; max_purchase_limit?: number | null };
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const unitPrice = item.sale_price ?? item.price;
  const subtotal = unitPrice * item.qty;

  const purchaseLimitBinding =
    item.max_purchase_limit != null &&
    (item.stock == null || item.max_purchase_limit <= item.stock);
  const cap = purchaseLimitBinding ? item.max_purchase_limit! : item.stock;
  const atMax = cap != null && item.qty >= cap;

  function handleIncrement() {
    if (atMax) {
      setError(purchaseLimitBinding ? `Max ${cap} per customer` : `Max stock is ${cap}`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    onQtyChange(item.qty + 1);
  }

  return (
    <div className="flex gap-4 bg-[#1a1a1a] border border-[#603e39]/25 p-4">
      {/* Image */}
      <Link href={`/product/${item.slug}`} className="shrink-0">
        <div className="relative w-20 h-20 bg-[#131313] border border-[#603e39]/20 overflow-hidden">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="80px"
            className="object-contain p-1"
            unoptimized
          />
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <Link href={`/product/${item.slug}`}>
            <h3 className="font-inter font-bold text-[13px] text-[#e2e2e2] leading-snug hover:text-primary transition-colors line-clamp-2">
              {item.name}
            </h3>
          </Link>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-[12px] text-primary">
              ₱{unitPrice.toLocaleString()}
            </span>
            {item.sale_price && (
              <span className="font-mono text-[10px] text-[#e2e2e2]/25 line-through">
                ₱{item.price.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center border border-[#603e39]/40">
              <button
                onClick={() => onQtyChange(item.qty - 1)}
                className="w-8 h-8 flex items-center justify-center text-[#e2e2e2]/40 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">remove</span>
              </button>
              <span className="w-8 text-center font-mono text-[13px] text-[#e2e2e2]">
                {item.qty}
              </span>
              <button
                onClick={handleIncrement}
                disabled={atMax}
                className="w-8 h-8 flex items-center justify-center text-[#e2e2e2]/40 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>
            <button
              onClick={onRemove}
              className="font-mono text-[10px] tracking-widest uppercase text-[#e2e2e2]/25 hover:text-primary transition-colors"
            >
              Remove
            </button>
          </div>
          {error && (
            <p className="font-mono text-[10px] text-red-400">{error}</p>
          )}
        </div>
      </div>

      {/* Subtotal */}
      <div className="shrink-0 text-right flex flex-col justify-between">
        <span className="font-inter font-black text-[16px] text-[#e2e2e2]">
          ₱{subtotal.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function OrderSummary({ total, count }: { total: number; count: number }) {
  return (
    <div className="sticky top-20 bg-[#1a1a1a] border border-[#603e39]/25 p-6 space-y-5">
      <h2 className="font-inter font-bold text-[16px] uppercase text-[#e2e2e2]">
        Order Summary
      </h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] text-[#ebbbb4]/50">Subtotal ({count} items)</span>
          <span className="font-mono text-[13px] text-[#e2e2e2]">₱{total.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] text-[#ebbbb4]/50">Shipping</span>
          <span className="font-mono text-[12px] text-[#ebbbb4]/50 italic">TBA</span>
        </div>
      </div>

      <div className="h-px bg-[#603e39]/30" />

      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] uppercase text-[#e2e2e2]">Estimated Total</span>
        <span className="font-inter font-black text-[22px] text-primary">
          ₱{total.toLocaleString()}
        </span>
      </div>

      <Link
        href="/checkout"
        className="flex items-center justify-center gap-3 w-full py-4 bg-primary text-white font-mono text-[11px] tracking-[0.2em] uppercase hover:brightness-110 active:scale-[0.98] transition-all"
      >
        <span className="material-symbols-outlined text-[16px]">lock</span>
        Proceed to Checkout
      </Link>

      <Link
        href="/collection/new-releases"
        className="flex items-center justify-center gap-2 w-full py-3 border border-[#603e39]/40 font-mono text-[10px] tracking-widest uppercase text-[#e2e2e2]/40 hover:text-primary hover:border-primary transition-all"
      >
        Continue Shopping
      </Link>

      <p className="font-mono text-[10px] text-[#ebbbb4]/25 text-center leading-relaxed">
        Shipping fee will be confirmed upon order processing.
      </p>
    </div>
  );
}
