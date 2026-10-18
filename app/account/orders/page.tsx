"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account/AccountProvider";
import {
  CARD, CardHeader, ItemThumb, OrderTotalInline, StatusBadge,
  formatDate, hasOpenDownPayment, peso, remainingOf,
} from "@/components/account/ui";

function getTrackingUrl(deliveryMethod: string, trackingNumber: string): string {
  const tn = encodeURIComponent(trackingNumber);
  switch (deliveryMethod) {
    case "J&T Express": return `https://www.jtexpress.ph/trajectoryQuery?flag=1&waybillNo=${tn}`;
    case "LBC": return `https://www.lbcexpress.com/search?waybillNo=${tn}`;
    case "Shopee Express": return `https://spx.ph/track?waybillNo=${tn}`;
    case "Grab Express": return `https://express.grab.com/track/orders?ids=${tn}`;
    case "Lalamove": return `https://web.lalamove.com/login?waybillNo=${tn}`;
    default: return "";
  }
}

export default function OrdersPage() {
  const { orders } = useAccount();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className={`${CARD} overflow-hidden`}>
      <CardHeader title="Order history" subtitle="Select an order to see its items, delivery and payment details." />
      {orders.length === 0 ? (
        <div className="text-center py-14 px-4">
          <span className="material-symbols-outlined text-[32px] text-accent/40">shopping_bag</span>
          <p className="text-[13px] text-accent/70 mt-2">No orders yet.</p>
          <Link href="/" className="inline-block mt-3 text-[13px] text-primary hover:underline underline-offset-2">
            Browse the store
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden md:grid grid-cols-[24px_120px_1fr_130px_120px] gap-3 px-4 py-2 border-b border-line/20 text-[10px] font-medium uppercase tracking-wider text-accent/60">
            <span />
            <span>Date</span>
            <span>Items</span>
            <span>Status</span>
            <span className="text-right">Total</span>
          </div>
          <ul className="divide-y divide-line/15">
            {orders.map(order => {
              const open = expanded === order.id;
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : order.id)}
                    aria-expanded={open}
                    className={`w-full text-left rounded-none grid grid-cols-[24px_1fr_auto] md:grid-cols-[24px_120px_1fr_130px_120px] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors ${
                      open ? "bg-fg/[0.03]" : "hover:bg-fg/[0.03]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-accent/50">
                      {open ? "expand_less" : "expand_more"}
                    </span>
                    <span className="text-[13px] text-fg tabular-nums">
                      {formatDate(order.created_at)}
                      {order.order_number != null && (
                        <span className="block text-[11px] text-accent/60">#{order.order_number}</span>
                      )}
                    </span>
                    <span className="hidden md:block min-w-0 text-[12px] text-accent/70 truncate">
                      {order.items.map(it => `${it.product} ×${it.qty}`).join(", ")}
                    </span>
                    <span className="col-start-2 md:col-start-auto row-start-2 md:row-start-auto">
                      <StatusBadge status={order.status} />
                    </span>
                    <span className="col-start-3 row-start-1 row-span-2 md:row-span-1 md:col-start-auto md:row-start-auto justify-self-end">
                      <OrderTotalInline order={order} />
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-line/20 bg-deep/60 px-4 md:px-6 py-4 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">
                      <div className="min-w-0">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-accent/60 border-b border-line/20">
                              <th className="py-2 pr-2 font-medium" colSpan={2}>Item</th>
                              <th className="py-2 font-medium text-center w-12">Qty</th>
                              <th className="py-2 font-medium text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line/10">
                            {order.items.map((item, i) => (
                              <tr key={i}>
                                <td className="py-2 pr-3 w-9">
                                  {item.slug ? (
                                    <Link href={`/product/${item.slug}`}>
                                      <ItemThumb src={item.image} alt={item.product} />
                                    </Link>
                                  ) : (
                                    <ItemThumb src={item.image} alt={item.product} />
                                  )}
                                </td>
                                <td className="py-2 text-fg">
                                  {item.slug ? (
                                    <Link href={`/product/${item.slug}`} className="hover:text-primary hover:underline underline-offset-2 transition-colors">
                                      {item.product}
                                    </Link>
                                  ) : (
                                    item.product
                                  )}
                                </td>
                                <td className="py-2 text-center text-accent/70 tabular-nums">×{item.qty}</td>
                                <td className="py-2 text-right text-fg tabular-nums">{peso(item.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {order.notes?.length > 0 && (
                          <div className="mt-4 space-y-1.5">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-accent/60">Notes</p>
                            {order.notes.map((note, i) => (
                              <p key={i} className="text-[12px] text-accent/80 leading-relaxed">{note}</p>
                            ))}
                          </div>
                        )}
                      </div>

                      <dl className="space-y-2 text-[12px] md:border-l md:border-line/20 md:pl-5">
                        {order.delivery_method && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-accent/70">Delivery</dt>
                            <dd className="text-fg text-right">{order.delivery_method}</dd>
                          </div>
                        )}
                        {order.delivery_method && order.tracking_number && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-accent/70">Tracking</dt>
                            <dd className="text-right tabular-nums break-all">
                              {(() => {
                                const url = getTrackingUrl(order.delivery_method!, order.tracking_number!);
                                return url
                                  ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-2">{order.tracking_number}</a>
                                  : <span className="text-fg">{order.tracking_number}</span>;
                              })()}
                            </dd>
                          </div>
                        )}
                        {order.payment_method && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-accent/70">Payment</dt>
                            <dd className="text-fg text-right">{order.payment_method}</dd>
                          </div>
                        )}
                        {order.delivery_method && order.delivery_method !== "Pickup" && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-accent/70">Shipping fee</dt>
                            <dd className="text-fg tabular-nums">{order.shipping_fee != null ? peso(order.shipping_fee) : "TBA"}</dd>
                          </div>
                        )}
                        {order.discount > 0 && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-accent/70">Discount</dt>
                            <dd className="text-emerald-400 tabular-nums">−{peso(order.discount)}</dd>
                          </div>
                        )}
                        {hasOpenDownPayment(order) && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-accent/70">Down payment</dt>
                            <dd className="text-fg tabular-nums">{peso(order.down_payment ?? 0)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between gap-3 pt-2 mt-1 border-t border-line/20 text-[13px]">
                          <dt className="text-fg font-medium">{hasOpenDownPayment(order) ? "Remaining balance" : "Total"}</dt>
                          <dd className="text-fg font-semibold tabular-nums">
                            {peso(hasOpenDownPayment(order) ? remainingOf(order) : order.estimated_total)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
