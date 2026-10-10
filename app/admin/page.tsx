"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Order, DbProduct } from "@/lib/supabase";

type Stats = {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  preOrderOrders: number;
  holdPreOrderOrders: number;
  processingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  activeProducts: number;
};

type LedgerEntry = {
  id: string;
  type: "incoming" | "outgoing";
  amount: number;
  entry_date: string;
};

const STATUS_COLORS: Record<string, string> = {
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

const SERIES = "rgb(var(--c-primary))";
const DAY = 86_400_000;
const WINDOW = 30;

const peso = (n: number) => `₱${Math.round(n).toLocaleString()}`;
const compactPeso = (n: number) =>
  n >= 1_000_000 ? `₱${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `₱${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k` : `₱${n}`;

// Manila calendar day for an ISO timestamp, as "YYYY-MM-DD".
const dayKey = (iso: string | number | Date) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

const isSale = (o: Order) => o.status === "completed";
const saleDate = (o: Order) => o.payment_date ?? o.created_at;

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap ${
        STATUS_COLORS[status] ?? "text-accent/60 border-line/40"
      }`}
    >
      {status}
    </span>
  );
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-[11px] text-accent/50">No change</span>;
  if (previous === 0) return <span className="text-[11px] text-accent/50">New this period</span>;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-accent/70">
      <span className={`material-symbols-outlined text-[14px] ${up ? "text-emerald-400" : "text-red-400"}`}>
        {up ? "trending_up" : "trending_down"}
      </span>
      <span className={`font-medium tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
        {up ? "+" : ""}
        {pct.toFixed(1)}%
      </span>
      <span className="ml-1">vs prior {WINDOW}d</span>
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const w = 96;
  const h = 28;
  const step = w / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0" aria-hidden>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={SERIES} opacity={0.12} />
      <polyline points={pts.join(" ")} fill="none" stroke={SERIES} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function KpiCard({
  label,
  icon,
  value,
  footer,
  spark,
}: {
  label: string;
  icon: string;
  value: string;
  footer: React.ReactNode;
  spark?: number[];
}) {
  return (
    <div className="bg-panel border border-line/30 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-accent/70">{label}</p>
        <span className="w-7 h-7 rounded-md bg-fg/[0.04] border border-line/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-[16px] text-accent/70">{icon}</span>
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[24px] leading-none font-semibold text-fg tabular-nums tracking-tight">{value}</p>
        {spark && <Sparkline values={spark} />}
      </div>
      <div className="pt-2 border-t border-line/20">{footer}</div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-panel border border-line/30 rounded-lg flex flex-col min-w-0 ${className}`}>
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line/20">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-fg">{title}</h2>
          {subtitle && <p className="text-[11px] text-accent/60 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="flex-1 min-w-0">{children}</div>
    </section>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5 text-[12px] text-accent/70 hover:text-primary transition-colors flex-shrink-0">
      View all
      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
    </Link>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RevenueTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as { label: string; revenue: number; orders: number };
  return (
    <div className="bg-panel border border-line/50 rounded-md shadow-xl shadow-black/40 px-3 py-2 space-y-0.5">
      <p className="text-[11px] text-accent/70">{p.label}</p>
      <p className="text-[12px] text-fg tabular-nums">
        Revenue <span className="font-semibold">{peso(p.revenue)}</span>
      </p>
      <p className="text-[12px] text-fg tabular-nums">
        Orders <span className="font-semibold">{p.orders}</span>
      </p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/orders").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/products").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/ledger").then((r) => (r.ok ? r.json() : [])),
    ]).then(([statsData, o, p, l]: [Stats | null, Order[], DbProduct[], LedgerEntry[]]) => {
      setStats(statsData);
      setOrders(o ?? []);
      setProducts(p ?? []);
      setLedger(l ?? []);
      setLoading(false);
    });
  }, []);

  const view = useMemo(() => {
    const now = Date.now();
    const days: string[] = [];
    for (let i = WINDOW - 1; i >= 0; i--) days.push(dayKey(now - i * DAY));
    const prevStart = dayKey(now - (2 * WINDOW - 1) * DAY);

    const byDay = new Map(days.map((d) => [d, { revenue: 0, orders: 0 }]));
    let prevRevenue = 0;
    let prevOrders = 0;
    let prevSales = 0;
    let sales = 0;

    for (const o of orders) {
      const created = dayKey(o.created_at);
      const bucket = byDay.get(created);
      if (bucket) bucket.orders++;
      else if (created >= prevStart && created < days[0]) prevOrders++;

      if (!isSale(o)) continue;
      const paid = dayKey(saleDate(o));
      const sb = byDay.get(paid);
      if (sb) {
        sb.revenue += o.estimated_total;
        sales++;
      } else if (paid >= prevStart && paid < days[0]) {
        prevRevenue += o.estimated_total;
        prevSales++;
      }
    }

    const series = days.map((d) => ({
      day: d,
      label: new Date(`${d}T00:00:00+08:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" }),
      ...byDay.get(d)!,
    }));
    const revenue = series.reduce((s, d) => s + d.revenue, 0);
    const orderCount = series.reduce((s, d) => s + d.orders, 0);

    const month = dayKey(now).slice(0, 7);
    const monthEntries = ledger.filter((e) => e.entry_date.slice(0, 7) === month);
    const incoming = monthEntries.filter((e) => e.type === "incoming").reduce((s, e) => s + e.amount, 0);
    const outgoing = monthEntries.filter((e) => e.type === "outgoing").reduce((s, e) => s + e.amount, 0);

    return {
      series,
      revenue,
      prevRevenue,
      orderCount,
      prevOrders,
      aov: sales ? revenue / sales : 0,
      prevAov: prevSales ? prevRevenue / prevSales : 0,
      incoming,
      outgoing,
      recent: orders.slice(0, 6),
      lowStock: products
        .filter((p) => p.status === "active" && p.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 6),
    };
  }, [orders, products, ledger]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4" aria-busy>
        <div className="h-7 w-48 rounded bg-fg/[0.06] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[132px] rounded-lg bg-panel border border-line/30 animate-pulse" />
          ))}
        </div>
        <div className="h-[320px] rounded-lg bg-panel border border-line/30 animate-pulse" />
      </div>
    );
  }

  const open = stats
    ? stats.pendingOrders + stats.preOrderOrders + stats.holdPreOrderOrders + (stats.processingOrders ?? 0) + stats.confirmedOrders
    : 0;

  const pipeline = stats
    ? [
        { status: "pending", count: stats.pendingOrders },
        { status: "pre-order", count: stats.preOrderOrders },
        { status: "hold pre-order", count: stats.holdPreOrderOrders },
        { status: "processing", count: stats.processingOrders ?? 0 },
        { status: "confirmed", count: stats.confirmedOrders },
        { status: "shipped", count: stats.shippedOrders },
        { status: "completed", count: stats.completedOrders },
        { status: "cancelled", count: stats.cancelledOrders },
        { status: "refunded", count: stats.refundedOrders ?? 0 },
      ]
    : [];
  const pipelineMax = Math.max(...pipeline.map((p) => p.count), 1);

  const net = view.incoming - view.outgoing;
  const flowTotal = view.incoming + view.outgoing;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-fg tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-accent/60 mt-0.5">Sales, fulfilment and cash flow over the last {WINDOW} days.</p>
        </div>
        {stats && (
          <dl className="flex items-center divide-x divide-line/30 rounded-lg border border-line/30 bg-panel text-[12px]">
            {[
              ["Lifetime revenue", peso(stats.totalRevenue)],
              ["All orders", stats.totalOrders.toLocaleString()],
              ["Active products", stats.activeProducts.toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="px-3 py-1.5">
                <dt className="text-[10px] uppercase tracking-wider font-medium text-accent/60">{k}</dt>
                <dd className="text-fg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue"
          icon="payments"
          value={peso(view.revenue)}
          spark={view.series.map((d) => d.revenue)}
          footer={<Delta current={view.revenue} previous={view.prevRevenue} />}
        />
        <KpiCard
          label="Orders placed"
          icon="receipt_long"
          value={view.orderCount.toLocaleString()}
          spark={view.series.map((d) => d.orders)}
          footer={<Delta current={view.orderCount} previous={view.prevOrders} />}
        />
        <KpiCard
          label="Avg. order value"
          icon="shopping_basket"
          value={peso(view.aov)}
          footer={<Delta current={view.aov} previous={view.prevAov} />}
        />
        <KpiCard
          label="Open orders"
          icon="pending_actions"
          value={open.toLocaleString()}
          footer={
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[11px] text-accent/70 hover:text-primary transition-colors">
              <span className="font-medium text-yellow-400 tabular-nums">{stats?.pendingOrders ?? 0}</span> pending review
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </Link>
          }
        />
      </div>

      {/* Trend + pipeline */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card
          className="xl:col-span-2"
          title="Revenue"
          subtitle={`Completed orders by payment date · last ${WINDOW} days`}
          action={<ViewAll href="/admin/analytics" />}
        >
          <div className="px-2 pt-4 pb-2 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={view.series} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgb(var(--c-line) / 0.25)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "rgb(var(--c-accent) / 0.7)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "rgb(var(--c-accent) / 0.7)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={compactPeso}
                  width={56}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "rgb(var(--c-accent) / 0.4)", strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={SERIES}
                  strokeWidth={2}
                  fill="url(#rev-fill)"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--c-panel))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Order pipeline" subtitle="All orders by status" action={<ViewAll href="/admin/orders" />}>
          <ul className="px-4 py-3 space-y-2.5">
            {pipeline.map((p) => (
              <li key={p.status} className="grid grid-cols-[112px_1fr_36px] items-center gap-3" title={`${p.status}: ${p.count}`}>
                <span>
                  <StatusBadge status={p.status} />
                </span>
                <div className="h-1.5 rounded-full bg-fg/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(p.count / pipelineMax) * 100}%` }} />
                </div>
                <span className="text-[12px] text-fg tabular-nums text-right">{p.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Recent orders + side panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" title="Recent orders" action={<ViewAll href="/admin/orders" />}>
          {view.recent.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-accent/60">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider font-medium text-accent/60 border-b border-line/20">
                    <th className="px-4 py-2 font-medium">Order</th>
                    <th className="px-4 py-2 font-medium">Customer</th>
                    <th className="px-4 py-2 font-medium hidden md:table-cell">Date</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/15">
                  {view.recent.map((o) => (
                    <tr key={o.id} className="hover:bg-fg/[0.03] transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Link href={`/admin/orders/${o.id}`} className="text-primary hover:underline underline-offset-2 tabular-nums">
                          {o.order_number != null ? `#${o.order_number}` : "View"}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-fg max-w-[200px] truncate">{o.name}</td>
                      <td className="px-4 py-2.5 text-accent/70 whitespace-nowrap tabular-nums hidden md:table-cell">{formatDate(o.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right text-fg font-medium tabular-nums whitespace-nowrap">{peso(o.estimated_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4 min-w-0">
          <Card title="Cash flow" subtitle="Ledger · this month" action={<ViewAll href="/admin/ledger" />}>
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-accent/70">Net</span>
                <span className={`text-[20px] font-semibold tabular-nums tracking-tight ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {net < 0 ? "−" : ""}
                  {peso(Math.abs(net))}
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-fg/[0.06] gap-[2px]" aria-hidden>
                {flowTotal > 0 && (
                  <>
                    <div className="bg-emerald-500 rounded-l-full" style={{ width: `${(view.incoming / flowTotal) * 100}%` }} />
                    <div className="bg-red-500 rounded-r-full" style={{ width: `${(view.outgoing / flowTotal) * 100}%` }} />
                  </>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <dt className="flex items-center gap-1.5 text-accent/70">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Incoming
                  </dt>
                  <dd className="text-fg font-medium tabular-nums mt-0.5">{peso(view.incoming)}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-accent/70">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Outgoing
                  </dt>
                  <dd className="text-fg font-medium tabular-nums mt-0.5">{peso(view.outgoing)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card title="Low stock" subtitle="Active products with 5 or fewer left" action={<ViewAll href="/admin/products" />}>
            {view.lowStock.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-accent/60">Nothing low on stock.</p>
            ) : (
              <ul className="divide-y divide-line/15">
                {view.lowStock.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-fg/[0.03] transition-colors"
                    >
                      <span className="text-[13px] text-fg truncate">{p.name}</span>
                      <span
                        className={`text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded border flex-shrink-0 ${
                          p.stock === 0
                            ? "text-red-400 border-red-400/30 bg-red-400/10"
                            : "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
                        }`}
                      >
                        {p.stock === 0 ? "Out" : `${p.stock} left`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
