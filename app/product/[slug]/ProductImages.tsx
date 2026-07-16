"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProductImages({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const main = images[selected] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square bg-[#1a1a1a] border border-[#603e39]/30 overflow-hidden">
        <Image
          src={main}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-6"
          unoptimized
          priority
        />
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              className={`shrink-0 w-16 h-16 border overflow-hidden transition-colors ${
                i === selected ? "border-primary" : "border-[#603e39]/40 hover:border-[#ebbbb4]/40"
              } bg-[#1a1a1a]`}
            >
              <img src={img} alt={`${name} view ${i + 1}`} className="w-full h-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
