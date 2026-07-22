"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar({
  defaultValue = "",
  autoFocus = false,
  onSubmit,
  className = "",
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();

  useEffect(() => setValue(defaultValue), [defaultValue]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    onSubmit?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 border border-[#603e39]/40 focus-within:border-primary bg-[#1a1a1a] px-3 py-2 transition-colors ${className}`}
    >
      <span className="material-symbols-outlined text-[#e2e2e2]/40" style={{ fontSize: 18 }}>
        search
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search products..."
        autoFocus={autoFocus}
        className="flex-1 bg-transparent font-mono text-[13px] text-[#e2e2e2] placeholder:text-[#e2e2e2]/30 outline-none"
      />
      <button
        type="submit"
        className="font-mono text-[10px] tracking-widest uppercase text-primary hover:underline shrink-0"
      >
        Search
      </button>
    </form>
  );
}
