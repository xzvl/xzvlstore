"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import { useSiteContent } from "@/components/SiteContentProvider";
import { activePaymentMethods } from "@/lib/site-content";
import PaymentMethodPicker from "@/components/PaymentMethodPicker";
import type { HoldPreOrder } from "@/app/api/account/hold-pre-orders/route";

const FACEBOOK_URL = "https://www.facebook.com/xzviel";
const STORAGE_PREFIX = "hold-pre-order-reminder:";

// Today in PH time, e.g. "2026-10-09" — the popup shows at most once per day.
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const orderLabel = (o: HoldPreOrder) =>
  o.order_number != null ? `#${String(o.order_number).padStart(5, "0")}` : "Pre-order";

// Once a day, reminds a signed-in customer about their "hold pre-order" orders:
// either the down payment (and its screenshot) is still owed, or the
// confirmation screenshot was never sent to the Facebook page.
export default function HoldPreOrderReminder() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const [orders, setOrders] = useState<HoldPreOrder[]>([]);
  const [open, setOpen] = useState(false);
  const defaultMethod = activePaymentMethods(useSiteContent().payment)[0] ?? null;

  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;

    async function check() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;
      const key = STORAGE_PREFIX + session.user.id;
      try {
        if (localStorage.getItem(key) === today()) return;
      } catch {}

      try {
        const res = await fetch("/api/account/hold-pre-orders", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data: HoldPreOrder[] = await res.json();
        if (cancelled || data.length === 0) return;
        setOrders(data);
        setOpen(true);
        try {
          localStorage.setItem(key, today());
        } catch {}
      } catch {}
    }

    check();
    const { data: sub } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") check();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || isAdmin) return null;

  const needsPayment = orders.some((o) => o.reason === "payment");

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-background/90 backdrop-blur-xl px-4 py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hold-reminder-title"
        className="w-full max-w-lg max-h-full overflow-y-auto bg-panel border border-orange-400/40 animate-fade-up"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line/30">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-orange-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">pending</span>
              Pre-Order On Hold
            </p>
            <h2 id="hold-reminder-title" className="font-inter font-black text-[20px] uppercase text-fg mt-1">
              Action Needed
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-accent/40 hover:text-primary transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="font-mono text-[12px] text-accent/60 leading-relaxed">
            {orders.length === 1 ? "Your pre-order is" : "Some of your pre-orders are"} on hold until we receive the
            following on our Facebook page{" "}
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              facebook.com/xzviel
            </a>
            :
          </p>

          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="border border-line/40 bg-deep px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[12px] text-fg font-bold">{orderLabel(o)}</p>
                  {o.reason === "payment" && (
                    <p className="font-mono text-[12px] text-orange-400 font-bold">
                      ₱{(o.required_down_payment - o.down_payment).toLocaleString()} due
                    </p>
                  )}
                </div>
                <p className="font-mono text-[11px] text-accent/50 mt-0.5 line-clamp-2">{o.products.join(", ")}</p>
                <p className="font-mono text-[11px] text-accent/70 mt-2 flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-orange-400/80 mt-px">
                    {o.reason === "payment" ? "payments" : "photo_camera"}
                  </span>
                  {o.reason === "payment"
                    ? "Pay the down payment, then send a screenshot of your payment."
                    : "Send a screenshot of the pre-order confirmation / thank you message."}
                </p>
              </div>
            ))}
          </div>

          {needsPayment && defaultMethod && (
            <PaymentMethodPicker methods={[defaultMethod]} value={defaultMethod.id} onChange={() => {}} />
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 px-5 py-4 border-t border-line/30">
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white font-mono text-[11px] tracking-widest uppercase hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            Message Us on Facebook
          </a>
          <Link
            href="/account/orders"
            onClick={() => setOpen(false)}
            className="flex-1 flex items-center justify-center px-5 py-3 border border-line text-accent/60 font-mono text-[11px] tracking-widest uppercase hover:border-primary hover:text-primary transition-all"
          >
            View Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
