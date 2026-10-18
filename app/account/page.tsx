"use client";

import Link from "next/link";
import { useAccount } from "@/components/account/AccountProvider";
import {
  CARD, CLOSED, CardHeader, Kpi, OrderTotalInline, StatusBadge,
  formatDate, peso, remainingOf,
} from "@/components/account/ui";


// Address shown on the customer info card: billing first, shipping as a fallback.
function summaryAddress(profile: ReturnType<typeof useAccount>["profile"]): string {
  const billing = [profile.billing_address_1, profile.billing_address_2, profile.billing_city, profile.billing_state, profile.billing_postcode]
    .filter(Boolean).join(", ");
  if (billing) return billing;
  const shipping = [profile.shipping_address_1, profile.shipping_address_2, profile.shipping_city, profile.shipping_state, profile.shipping_postcode]
    .filter(Boolean).join(", ");
  return shipping || "—";
}

export default function AccountDashboardPage() {
  const { orders, favorites, waitlist, profile } = useAccount();

  const openOrders = orders.filter(o => !CLOSED.includes(o.status));
  const spent = orders.filter(o => o.status === "completed").reduce((s, o) => s + o.estimated_total, 0);
  const balanceDue = openOrders.reduce((s, o) => s + remainingOf(o), 0);
  const recent = orders.slice(0, 5);

  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || "—";
  const phone = profile.billing_phone || profile.shipping_phone || "—";
  const address = summaryAddress(profile);

  const missing = [
    !profile.facebook_url.trim() && "Facebook link",
    !profile.billing_address_1.trim() && "billing address",
    !profile.shipping_address_1.trim() && "shipping address",
  ].filter(Boolean) as string[];

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Kpi label="Total orders" icon="receipt_long" value={orders.length.toLocaleString()} hint="All time" />
        <Kpi label="Open orders" icon="pending_actions" value={openOrders.length.toLocaleString()} hint="Not yet completed" />
        <Kpi label="Total spent" icon="payments" value={peso(spent)} hint="Completed orders" />
        <Kpi label="Balance due" icon="account_balance_wallet" value={peso(balanceDue)} hint="Open orders, after down payments" />
      </div>

      <section className={CARD}>
        <CardHeader
          title="Customer"
          subtitle="Your account details"
          action={
            <Link href="/account/profile" className="text-[12px] text-primary hover:underline underline-offset-2">
              Edit
            </Link>
          }
        />
        <dl className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-accent/60 mb-1">Name</dt>
            <dd className="text-fg">{fullName}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-accent/60 mb-1">Email</dt>
            <dd className="text-fg truncate">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-accent/60 mb-1">Phone</dt>
            <dd className="text-fg">{phone}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-accent/60 mb-1">Type</dt>
            <dd>
              <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border text-primary border-primary/30 bg-primary/10">
                Customer
              </span>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] uppercase tracking-wider text-accent/60 mb-1">Address</dt>
            <dd className="text-fg">{address}</dd>
          </div>
        </dl>
      </section>

      {missing.length > 0 && (
        <Link
          href={profile.facebook_url.trim() ? "/account/billing" : "/account/profile"}
          className="flex items-start gap-3 border border-primary/30 bg-primary/5 rounded-lg px-4 py-3 hover:bg-primary/10 transition-colors"
        >
          <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0 mt-0.5">info</span>
          <div>
            <p className="text-[13px] font-medium text-fg">Finish setting up your account</p>
            <p className="text-[12px] text-accent/70 mt-0.5 leading-relaxed">
              Add your {missing.join(", ")} so checkout and pre-orders fill in automatically.
            </p>
          </div>
        </Link>
      )}

      <section className={`${CARD} overflow-hidden`}>
        <CardHeader
          title="Recent orders"
          action={orders.length > 0 ? (
            <Link href="/account/orders" className="text-[12px] text-primary hover:underline underline-offset-2">
              View all
            </Link>
          ) : undefined}
        />
        {recent.length === 0 ? (
          <div className="text-center py-10 px-4">
            <span className="material-symbols-outlined text-[32px] text-accent/40">shopping_bag</span>
            <p className="text-[13px] text-accent/70 mt-2">No orders yet.</p>
            <Link href="/" className="inline-block mt-3 text-[13px] text-primary hover:underline underline-offset-2">
              Browse the store
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line/15">
            {recent.map(order => (
              <li key={order.id}>
                <Link
                  href="/account/orders"
                  className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-fg/[0.03] transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] text-fg tabular-nums">
                      {formatDate(order.created_at)}
                      {order.order_number != null && <span className="text-accent/60"> · #{order.order_number}</span>}
                    </span>
                    <span className="block text-[12px] text-accent/70 truncate">
                      {order.items.map(it => `${it.product} ×${it.qty}`).join(", ")}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <OrderTotalInline order={order} />
                    <StatusBadge status={order.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/account/favorites" className={`${CARD} p-4 flex items-center gap-3 hover:border-primary/40 transition-colors`}>
          <span className="material-symbols-outlined text-primary text-[22px]">favorite</span>
          <span>
            <span className="block text-[14px] font-semibold text-fg tabular-nums">{favorites.length} in your favorites</span>
            <span className="block text-[12px] text-accent/60">Products you&apos;ve favorited</span>
          </span>
        </Link>
        <Link href="/account/waitlist" className={`${CARD} p-4 flex items-center gap-3 hover:border-primary/40 transition-colors`}>
          <span className="material-symbols-outlined text-primary text-[22px]">notifications</span>
          <span>
            <span className="block text-[14px] font-semibold text-fg tabular-nums">{waitlist.length} on your waitlist</span>
            <span className="block text-[12px] text-accent/60">Products you&apos;re waiting on</span>
          </span>
        </Link>
      </section>

    </>
  );
}
