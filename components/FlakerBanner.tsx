"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export default function FlakerBanner({ className = "mb-8" }: { className?: string }) {
  const { isFlaker, isBlocked } = useCart();
  // A blocked account already gets the (stricter) blocked banner.
  if (!isFlaker || isBlocked) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-amber-500/40 bg-amber-500/5 px-5 py-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-400 text-[20px] flex-shrink-0 mt-0.5">warning</span>
        <div>
          <p className="font-mono text-[12px] text-amber-400 tracking-wide uppercase">Pre-Orders Unavailable</p>
          <p className="font-mono text-[11px] text-accent/60 mt-1 leading-relaxed">
            Your account can&apos;t place pre-orders. You can still order available items through checkout.
          </p>
        </div>
      </div>
      <Link
        href="/account"
        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 border border-amber-500/40 text-amber-400 font-mono text-[10px] tracking-widest uppercase hover:bg-amber-500/10 transition-colors whitespace-nowrap"
      >
        View Details
        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
      </Link>
    </div>
  );
}
