"use client";

import Link from "next/link";
import type { ListedProduct } from "@/lib/account-list";
import { CARD, CardHeader, ItemThumb, peso } from "./ui";

function availability(p: ListedProduct) {
  if (p.sneak_peek) return { label: "Coming soon", tone: "text-sky-400" };
  if (p.status !== "active") return { label: "Unavailable", tone: "text-accent/60" };
  if (p.pre_order) return { label: "Pre-order", tone: "text-purple-400" };
  if (p.stock > 0) return { label: "In stock", tone: "text-emerald-400" };
  return { label: "Out of stock", tone: "text-accent/60" };
}

export default function ProductList({
  title,
  subtitle,
  emptyIcon,
  emptyText,
  items,
  removeLabel,
  onRemove,
}: {
  title: string;
  subtitle: string;
  emptyIcon: string;
  emptyText: string;
  items: ListedProduct[];
  removeLabel: string;
  onRemove: (productId: string) => void;
}) {
  return (
    <section className={`${CARD} overflow-hidden`}>
      <CardHeader title={title} subtitle={subtitle} />
      {items.length === 0 ? (
        <div className="text-center py-14 px-4">
          <span className="material-symbols-outlined text-[32px] text-accent/40">{emptyIcon}</span>
          <p className="text-[13px] text-accent/70 mt-2">{emptyText}</p>
          <Link href="/collection/all" className="inline-block mt-3 text-[13px] text-primary hover:underline underline-offset-2">
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line/15">
          {items.map(p => {
            const a = availability(p);
            const price = p.sale_price ?? p.price;
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/product/${p.slug}`} className="flex-shrink-0">
                  <ItemThumb src={p.image} alt={p.name} size={48} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${p.slug}`}
                    className="block text-[13px] text-fg font-medium truncate hover:text-primary transition-colors"
                  >
                    {p.name}
                  </Link>
                  <p className="text-[12px] tabular-nums mt-0.5">
                    <span className="text-fg">{peso(price)}</span>
                    {p.sale_price != null && (
                      <span className="text-accent/50 line-through ml-1.5">{peso(p.price)}</span>
                    )}
                    <span className={`ml-2 ${a.tone}`}>· {a.label}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  className="flex-shrink-0 text-[12px] text-accent/70 hover:text-red-400 transition-colors flex items-center gap-1 px-2 py-1 border border-line/40"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                  <span className="hidden sm:inline">{removeLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
