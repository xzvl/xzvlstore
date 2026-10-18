"use client";

import Image from "next/image";
import type { Order } from "@/lib/supabase";
import { sizedImageUrl } from "@/lib/image-sizes";

export const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  "pre-order": "text-purple-400 border-purple-400/30 bg-purple-400/10",
  "hold pre-order": "text-fuchsia-400 border-fuchsia-400/30 bg-fuchsia-400/10",
  processing: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  confirmed: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  shipped: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  completed: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  cancelled: "text-accent/60 border-accent/20 bg-accent/5",
  refunded: "text-accent/60 border-accent/20 bg-accent/5",
};

export const CLOSED: Order["status"][] = ["completed", "cancelled", "refunded"];

export const INPUT = "w-full bg-deep border border-line/70 text-fg text-[13px] px-3.5 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors placeholder:text-accent/40";
export const LABEL = "block text-[12px] font-medium text-accent/80 mb-1.5";
export const CARD = "bg-panel border border-line/30 rounded-lg";
export const PRIMARY_BTN = "inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm";

export const peso = (n: number) => `₱${n.toLocaleString()}`;
export const remainingOf = (o: Order) => Math.max(0, o.estimated_total - (o.down_payment ?? 0));
export const hasOpenDownPayment = (o: Order) => (o.down_payment ?? 0) > 0 && o.status !== "completed";

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila",
  });

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap ${STATUS_COLORS[status] ?? "text-accent/60 border-line/40"}`}>
      {status}
    </span>
  );
}

export function OrderTotalInline({ order }: { order: Order }) {
  if (!hasOpenDownPayment(order)) {
    return <span className="text-[13px] text-fg font-semibold tabular-nums">{peso(order.estimated_total)}</span>;
  }
  return (
    <div className="leading-tight text-right">
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-[11px] text-accent/50 line-through tabular-nums">{peso(order.estimated_total)}</span>
        <span className="text-[13px] text-fg font-semibold tabular-nums">{peso(remainingOf(order))}</span>
      </div>
      <p className="text-[11px] text-accent/60 tabular-nums">DP {peso(order.down_payment ?? 0)} paid</p>
    </div>
  );
}

export function ItemThumb({ src, alt, size = 36 }: { src?: string | null; alt: string; size?: number }) {
  return (
    <div
      className="relative bg-deep border border-line/30 overflow-hidden flex-shrink-0 rounded-md"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={sizedImageUrl(src, "small") ?? src}
          alt={alt}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={(e) => {
            if (e.currentTarget.src !== src) e.currentTarget.src = src;
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="material-symbols-outlined text-[16px] text-accent/40">image</span>
        </div>
      )}
    </div>
  );
}

export function Kpi({ label, icon, value, hint }: { label: string; icon: string; value: string; hint: string }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-accent/70">{label}</p>
        <span className="material-symbols-outlined text-[18px] text-accent/50">{icon}</span>
      </div>
      <p className="mt-2 text-[22px] leading-none font-semibold text-fg tabular-nums tracking-tight">{value}</p>
      <p className="mt-2 text-[11px] text-accent/60">{hint}</p>
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line/20">
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold text-fg">{title}</h2>
        {subtitle && <p className="text-[12px] text-accent/60 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
