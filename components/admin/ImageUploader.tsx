"use client";

import { useState } from "react";
import Image from "next/image";
import { LABEL } from "./formKit";
import { sizedImageUrl } from "@/lib/image-sizes";
import MediaLibraryModal from "./MediaLibraryModal";

export default function ImageUploader({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-28 h-20 shrink-0 border border-[#603e39]/40 bg-[#0e0e0e] overflow-hidden relative">
          {value ? (
            <Image
              src={sizedImageUrl(value, "thumbnail") ?? value}
              alt=""
              fill
              sizes="120px"
              className="object-contain"
              onError={(e) => {
                if (e.currentTarget.src !== value) e.currentTarget.src = value;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#ebbbb4]/20">
              <span className="material-symbols-outlined text-[24px]">image</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="px-4 py-2 border border-[#603e39]/60 text-[#ebbbb4]/60 font-mono text-[10px] tracking-widest uppercase cursor-pointer hover:border-primary hover:text-primary transition-colors"
          >
            {value ? "Replace" : "Upload"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {hint && <p className="mt-1.5 font-mono text-[10px] text-[#ebbbb4]/30">{hint}</p>}

      {showPicker && (
        <MediaLibraryModal
          onClose={() => setShowPicker(false)}
          onSelect={(urls) => {
            onChange(urls[0]);
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}
