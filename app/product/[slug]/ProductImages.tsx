"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export default function ProductImages({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const main = images[selected] ?? images[0];

  function scrollByAmount(amount: number) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square bg-[#1a1a1a] border border-[#603e39]/30 p-6 overflow-hidden">
        <div className="relative aspect-square">
          <Image
            src={main}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain bg-white"
            unoptimized
            priority
          />
      </div>
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByAmount(-200)}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-[#e2e2e2]/50 border border-[#603e39]/40 hover:text-primary hover:border-primary transition-colors"
            aria-label="Scroll thumbnails left"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-none scroll-smooth">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={`shrink-0 w-24 h-24 border overflow-hidden transition-colors ${
                  i === selected ? "border-primary" : "border-[#603e39]/40 hover:border-[#ebbbb4]/40"
                } bg-[#1a1a1a]`}
              >
                <img src={img} alt={`${name} view ${i + 1}`} className="w-full h-full object-contain p-1" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollByAmount(200)}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-[#e2e2e2]/50 border border-[#603e39]/40 hover:text-primary hover:border-primary transition-colors"
            aria-label="Scroll thumbnails right"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
