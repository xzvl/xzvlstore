"use client";

import { useRef, useState, useCallback } from "react";
import type { StoreProduct } from "@/lib/store-types";
import ProductCard from "@/components/ProductCard";

export default function MobileProductCarousel({ products }: { products: StoreProduct[] }) {
  const n = products.length;
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const cardW = el.scrollWidth / n;
      const idx = Math.round(el.scrollLeft / cardW);
      setActiveIdx(Math.max(0, Math.min(idx, n - 1)));
    }, 80);
  }, [n]);

  const goTo = useCallback((idx: number) => {
    if (!scrollRef.current) return;
    const cardW = scrollRef.current.scrollWidth / n;
    scrollRef.current.scrollTo({ left: cardW * idx, behavior: "smooth" });
    setActiveIdx(idx);
  }, [n]);

  if (n === 0) return null;

  return (
    <div className="md:hidden">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4 pb-2 scrollbar-none"
      >
        {products.map((p) => (
          <div key={p.id} className="snap-start flex-shrink-0 w-[calc(50%-6px)]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {products.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`transition-all duration-300 ${
              i === activeIdx
                ? "w-8 h-[3px] bg-primary"
                : "w-3 h-[3px] bg-[#603e39]/60 hover:bg-[#603e39]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
