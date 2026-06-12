"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import type { StoreProduct } from "@/lib/store-types";

const VISIBLE = 3;
const SLIDE_MS = 420;
const AUTO_MS = 5000;

export default function PreOrderCarousel({ products }: { products: StoreProduct[] }) {
  const n = products.length;

  // Build extended array: [last VISIBLE clones, ...real items, first VISIBLE clones]
  // This lets us slide past either end and snap back seamlessly.
  const ext = useMemo(
    () => [
      ...products.slice(-VISIBLE),
      ...products,
      ...products.slice(0, VISIBLE),
    ],
    [products]
  );
  const E = ext.length; // n + 2*VISIBLE

  // pos = index in ext[] of the leftmost visible card.
  // pos=VISIBLE → first real item (ext[VISIBLE] = real[0]).
  const [pos, setPos] = useState(VISIBLE);
  const [sliding, setSliding] = useState(false);
  const posRef = useRef(VISIBLE);
  const busyRef = useRef(false);

  function shift(dir: 1 | -1) {
    if (busyRef.current) return;
    busyRef.current = true;
    posRef.current += dir;
    setPos(posRef.current);
    setSliding(true);
  }

  const goNext = useCallback(() => shift(1), []);
  const goPrev = useCallback(() => shift(-1), []);

  function handleTransitionEnd() {
    const p = posRef.current;

    // Snap if we've scrolled into the clone zones
    if (p >= VISIBLE + n) {
      posRef.current = VISIBLE;
      setSliding(false);           // disable transition momentarily
      setPos(VISIBLE);             // instant snap to real start
    } else if (p < VISIBLE) {
      posRef.current = VISIBLE + n - 1;
      setSliding(false);
      setPos(VISIBLE + n - 1);    // instant snap to real end
    } else {
      setSliding(false);
    }

    // Unlock after paint so the snap re-render has settled
    requestAnimationFrame(() => requestAnimationFrame(() => {
      busyRef.current = false;
    }));
  }

  // Auto-advance
  useEffect(() => {
    if (n <= VISIBLE) return;
    const id = setInterval(goNext, AUTO_MS);
    return () => clearInterval(id);
  }, [goNext, n]);

  if (n === 0) return null;

  // If too few items for a real carousel, render statically
  if (n <= VISIBLE) {
    return (
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {products.map((p) => (
          <CarouselCard key={p.id} product={p} />
        ))}
      </div>
    );
  }

  // ── CSS maths ────────────────────────────────────────────────────────────────
  // Container = 100%. Each card = 100%/VISIBLE = 33.33% of container.
  // Track width = E cards * 33.33% container = (E/VISIBLE)*100% of container.
  // translateX is in % of TRACK width, so:
  //   -(pos / E) * 100% of track = -(pos / VISIBLE) * 100% of container (1 card = 33.33%).
  const trackW = (E / VISIBLE) * 100;           // % of container
  const cardW  = (1 / E) * 100;                 // % of track
  const tx     = -(pos / E) * 100;              // % of track

  // Active dot: which real item is first in view
  const dotIdx = ((pos - VISIBLE) % n + n) % n;

  return (
    <div className="relative px-1">
      {/* Prev arrow */}
      <button
        onClick={goPrev}
        className="absolute left-0 top-[40%] -translate-y-1/2 -translate-x-5 z-10 w-10 h-10 bg-[#1a1a1a] border border-[#603e39]/40 hidden md:flex items-center justify-center text-[#e2e2e2]/50 hover:border-primary hover:text-primary transition-all"
        aria-label="Previous"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
      </button>

      {/* Next arrow */}
      <button
        onClick={goNext}
        className="absolute right-0 top-[40%] -translate-y-1/2 translate-x-5 z-10 w-10 h-10 bg-[#1a1a1a] border border-[#603e39]/40 hidden md:flex items-center justify-center text-[#e2e2e2]/50 hover:border-primary hover:text-primary transition-all"
        aria-label="Next"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>

      {/* Overflow mask */}
      <div className="overflow-hidden">
        <div
          className="flex"
          style={{
            width: `${trackW}%`,
            transform: `translateX(${tx}%)`,
            transition: sliding
              ? `transform ${SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
              : "none",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {ext.map((product, i) => (
            <div
              key={`${product.id}-${i}`}
              style={{ width: `${cardW}%` }}
              className="px-1.5"
            >
              <CarouselCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-5">
        {products.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (busyRef.current) return;
              posRef.current = VISIBLE + i;
              setSliding(false);
              setPos(VISIBLE + i);
            }}
            aria-label={`Go to slide ${i + 1}`}
            className={`transition-all duration-300 ${
              i === dotIdx
                ? "w-8 h-[3px] bg-primary"
                : "w-3 h-[3px] bg-[#603e39]/60 hover:bg-[#603e39]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Individual card ──────────────────────────────────────────────────────────

function CarouselCard({ product }: { product: StoreProduct }) {
  const img = product.social_image ?? product.image;
  return (
    <Link
      href={`/pre-order?product=${product.id}`}
      className="group block relative overflow-hidden border border-[#603e39]/30 hover:border-primary/60 transition-all"
      style={{ aspectRatio: "3/3" }}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
          <span className="material-symbols-outlined text-[48px] text-[#603e39]/30">sports_esports</span>
        </div>
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
        <p className="font-mono text-[8px] md:text-[9px] tracking-[0.2em] uppercase text-primary mb-1">
          Pre-Order
        </p>
        <p className="font-inter font-bold text-[12px] md:text-[13px] text-white leading-tight line-clamp-2">
          {product.name}
        </p>
        <p className="font-mono text-[11px] md:text-[12px] text-[#ebbbb4]/80 mt-1">
          ₱{(product.sale_price ?? product.price).toLocaleString()}
        </p>
      </div>

      {/* Hover CTA */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="font-mono text-[8px] bg-primary text-white px-2 py-1 tracking-widest uppercase">
          Order Now
        </span>
      </div>
    </Link>
  );
}
