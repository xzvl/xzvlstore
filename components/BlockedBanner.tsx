"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export default function BlockedBanner({ className = "mb-8" }: { className?: string }) {
  const { isBlocked } = useCart();
  if (!isBlocked) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-red-500/40 bg-red-500/5 px-5 py-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-red-400 text-[20px] flex-shrink-0 mt-0.5">gpp_bad</span>
        <div>
          <p className="font-mono text-[12px] text-red-400 tracking-wide uppercase">Account Blocked</p>
          <p className="font-mono text-[11px] text-[#ebbbb4]/60 mt-1 leading-relaxed">
            Your account has been blocked and cannot add items to cart or place pre-orders.
          </p>
        </div>
      </div>
      <Link
        href="/account"
        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 border border-red-500/40 text-red-400 font-mono text-[10px] tracking-widest uppercase hover:bg-red-500/10 transition-colors whitespace-nowrap"
      >
        View Details
        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
      </Link>
    </div>
  );
}
