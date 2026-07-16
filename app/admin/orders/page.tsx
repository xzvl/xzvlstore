"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Order, OrderStatus } from "@/lib/supabase";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "pre-order", label: "Pre-Order" },
  { value: "processing", label: "Processing" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  "pre-order": "text-purple-400 border-purple-400/30 bg-purple-400/10",
  processing: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  confirmed: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  shipped: "text-green-400 border-green-400/30 bg-green-400/10",
  completed: "text-primary border-primary/30 bg-primary/10",
  cancelled: "text-[#ebbbb4]/40 border-[#ebbbb4]/20 bg-[#ebbbb4]/5",
};

const ALL_STATUSES: OrderStatus[] = ["pending", "pre-order", "processing", "confirmed", "shipped", "completed", "cancelled"];

type Stats = {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  preOrderOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  activeProducts: number;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  facebook_url: string | null;
};

// ─── Date filter helpers ──────────────────────────────────────────────────────

const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { value, label };
  });
}

function defaultDateRange(): { from: Date; to: Date } {
  const now = new Date();
  return { from: sod(new Date(now.getFullYear(), now.getMonth() - 3, 1)), to: eod(now) };
}

function resolveDateRange(dateFilter: string, dateFrom: string, dateTo: string): { from: Date; to: Date } | null {
  if (dateFilter === "all") return null;
  if (dateFilter === "default") return defaultDateRange();
  if (dateFilter === "custom") {
    if (!dateFrom && !dateTo) return null;
    return {
      from: dateFrom ? sod(new Date(dateFrom)) : new Date(0),
      to: dateTo ? eod(new Date(dateTo)) : eod(new Date()),
    };
  }
  const m = /^(\d{4})-(\d{2})$/.exec(dateFilter);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0, 23, 59, 59, 999) };
  }
  return null;
}

// ─── Combobox filters ─────────────────────────────────────────────────────────

function ProductFilterCombobox({
  names,
  selected,
  onSelect,
}: {
  names: string[];
  selected: string;
  onSelect: (name: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? names.filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    : names;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center gap-2 bg-[#0e0e0e] border border-primary/40 px-3 py-1.5 min-w-[220px]">
        <span className="font-mono text-[12px] text-[#e2e2e2] flex-1 truncate">{selected}</span>
        <button
          type="button"
          onClick={() => { onSelect(null); setQuery(""); }}
          className="flex-shrink-0 text-[#ebbbb4]/40 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">close</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative min-w-[220px]">
      <div className="flex items-center gap-2 bg-[#0e0e0e] border border-[#603e39] focus-within:border-primary transition-colors px-3">
        <span className="material-symbols-outlined text-[#ebbbb4]/30 text-[15px] flex-shrink-0">search</span>
        <input
          type="text"
          placeholder="Search product…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent text-[#e2e2e2] font-mono text-[12px] py-1.5 focus:outline-none placeholder:text-[#ebbbb4]/20"
        />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-px bg-[#161616] border border-[#603e39] max-h-[200px] overflow-y-auto shadow-xl shadow-black/60">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 font-mono text-[11px] text-[#ebbbb4]/30 text-center">No products found.</div>
          ) : (
            filtered.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => { onSelect(name); setQuery(""); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 font-mono text-[12px] text-[#e2e2e2] hover:bg-[#222] border-b border-[#603e39]/10 transition-colors truncate"
              >
                {name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CustomerFilterCombobox({
  customers,
  selectedId,
  onSelect,
}: {
  customers: Customer[];
  selectedId: string;
  onSelect: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = customers.find((c) => c.id === selectedId) ?? null;
  const displayName = (c: Customer) => [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;

  const filtered = query.trim()
    ? customers.filter((c) => {
        const q = query.toLowerCase();
        return displayName(c).toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      })
    : customers;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center gap-2 bg-[#0e0e0e] border border-primary/40 px-3 py-1.5 min-w-[220px]">
        <span className="font-mono text-[12px] text-[#e2e2e2] flex-1 truncate">{displayName(selected)}</span>
        <button
          type="button"
          onClick={() => { onSelect(null); setQuery(""); }}
          className="flex-shrink-0 text-[#ebbbb4]/40 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">close</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative min-w-[220px]">
      <div className="flex items-center gap-2 bg-[#0e0e0e] border border-[#603e39] focus-within:border-primary transition-colors px-3">
        <span className="material-symbols-outlined text-[#ebbbb4]/30 text-[15px] flex-shrink-0">search</span>
        <input
          type="text"
          placeholder="Filter by registered customer"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent text-[#e2e2e2] font-mono text-[12px] py-1.5 focus:outline-none placeholder:text-[#ebbbb4]/20"
        />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-px bg-[#161616] border border-[#603e39] max-h-[200px] overflow-y-auto shadow-xl shadow-black/60">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 font-mono text-[11px] text-[#ebbbb4]/30 text-center">No customers found.</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onSelect(c.id); setQuery(""); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 font-mono text-[12px] text-[#e2e2e2] hover:bg-[#222] border-b border-[#603e39]/10 transition-colors truncate"
              >
                {displayName(c)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Order total / customer name renderers ────────────────────────────────────

function OrderTotalInline({ order }: { order: Order }) {
  const downPayment = order.down_payment ?? 0;
  if (order.status !== "pre-order" || downPayment <= 0) {
    return (
      <span className="font-mono text-[13px] text-primary font-bold">
        ₱{order.estimated_total.toLocaleString()}
      </span>
    );
  }
  const remaining = Math.max(0, order.estimated_total - downPayment);
  return (
    <div className="leading-tight">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-[#ebbbb4]/40 line-through">₱{order.estimated_total.toLocaleString()}</span>
        <span className="font-mono text-[13px] text-primary font-bold">₱{remaining.toLocaleString()}</span>
      </div>
      <p className="font-mono text-[9px] text-[#ebbbb4]/30">DP ₱{downPayment.toLocaleString()} paid</p>
    </div>
  );
}

function CustomerNameLink({ order, facebookUrl }: { order: Order; facebookUrl?: string }) {
  if (facebookUrl) {
    return (
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="hover:text-primary hover:underline underline-offset-2 transition-colors"
      >
        {order.name}
      </a>
    );
  }
  return <>{order.name}</>;
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminOrdersPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "all";
  const productFilter = searchParams.get("product") ?? "all";
  const customerFilter = searchParams.get("customer") ?? "all";
  const dateFilter = searchParams.get("dateFilter") ?? "default";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  const setParam = (key: string, value: string, def: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === def) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allProductNames, setAllProductNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchOrders = async (s = status) => {
    setLoading(true);
    const qs = s !== "all" ? `?status=${s}` : "";
    const res = await fetch(`/api/admin/orders${qs}`);
    if (res.ok) {
      const data: Order[] = await res.json();
      setOrders(data);
      const names = Array.from(
        new Set(data.flatMap((o) => o.items.map((it) => it.product)).filter(Boolean))
      ).sort();
      setAllProductNames(names);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
  };

  const fetchCustomers = async () => {
    const res = await fetch("/api/admin/customers");
    if (res.ok) setCustomers(await res.json());
  };

  useEffect(() => { fetchStats(); fetchCustomers(); }, []);
  useEffect(() => { fetchOrders(status); }, [status]);

  const customerMap = useMemo(() => {
    const m: Record<string, Customer> = {};
    for (const c of customers) m[c.id] = c;
    return m;
  }, [customers]);

  const updateStatus = async (id: string, newStatus: OrderStatus) => {
    setUpdating(id);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrders(prev => prev.map(o => (o.id === id ? updated : o)));
      fetchStats();
    }
    setUpdating(null);
  };

  const deleteOrder = async (id: string) => {
    setDeleting(id);
    const res = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
    if (res.ok) {
      setOrders(prev => prev.filter(o => o.id !== id));
      fetchStats();
    }
    setDeleting(null);
    setConfirmDelete(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
    });

  const dateRange = useMemo(() => resolveDateRange(dateFilter, dateFrom, dateTo), [dateFilter, dateFrom, dateTo]);

  const visibleOrders = orders
    .filter((o) => productFilter === "all" || o.items.some((it) => it.product === productFilter))
    .filter((o) => customerFilter === "all" || o.customer_id === customerFilter)
    .filter((o) => {
      if (!dateRange) return true;
      const d = new Date(o.created_at);
      return d >= dateRange.from && d <= dateRange.to;
    });

  const filteredProductStats = productFilter !== "all"
    ? visibleOrders.reduce(
        (acc, o) => {
          const matched = o.items.filter((it) => it.product === productFilter);
          return {
            qty: acc.qty + matched.reduce((s, it) => s + it.qty, 0),
            total: acc.total + matched.reduce((s, it) => s + it.subtotal, 0),
          };
        },
        { qty: 0, total: 0 }
      )
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-1 uppercase">ADMIN // ORDERS</p>
          <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">Orders</h1>
        </div>
        <Link
          href="/admin/orders/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/20 transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          New Order
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Orders", value: stats.totalOrders, icon: "receipt_long" },
            { label: "Total Revenue", value: `₱${stats.totalRevenue.toLocaleString()}`, icon: "payments" },
            { label: "Pre-Order", value: stats.preOrderOrders, icon: "schedule" },
            { label: "Shipped", value: stats.shippedOrders, icon: "local_shipping" },
          ].map((s) => (
            <div key={s.label} className="bg-[#1a1a1a] border border-[#603e39]/30 p-4 space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#ebbbb4]/50 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
                {s.label}
              </div>
              <p className="font-inter font-black text-[22px] text-[#e2e2e2]">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-[#603e39]/30 pb-0">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setParam("status", tab.value, "all")}
            className={`px-4 py-2 font-mono text-[11px] tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap ${
              status === tab.value
                ? "text-primary border-primary"
                : "text-[#ebbbb4]/40 border-transparent hover:text-[#e2e2e2]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dates / Customer / Product filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={dateFilter}
          onChange={(e) => setParam("dateFilter", e.target.value, "default")}
          className="bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-3 py-1.5 focus:outline-none focus:border-primary transition-colors"
        >
          <option value="all">All Dates</option>
          <option value="default">Default</option>
          <option value="custom">Custom</option>
          {monthOptions().map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {dateFilter === "custom" && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setParam("dateFrom", e.target.value, "")}
              className="bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-3 py-1.5 focus:outline-none focus:border-primary transition-colors"
            />
            <span className="font-mono text-[10px] text-[#ebbbb4]/30">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setParam("dateTo", e.target.value, "")}
              className="bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-3 py-1.5 focus:outline-none focus:border-primary transition-colors"
            />
          </>
        )}

        <CustomerFilterCombobox
          customers={customers}
          selectedId={customerFilter === "all" ? "" : customerFilter}
          onSelect={(id) => setParam("customer", id ?? "all", "all")}
        />

        {allProductNames.length > 0 && (
          <ProductFilterCombobox
            names={allProductNames}
            selected={productFilter === "all" ? "" : productFilter}
            onSelect={(name) => setParam("product", name ?? "all", "all")}
          />
        )}

        {filteredProductStats && (
          <div className="flex items-center gap-4 border-l border-[#603e39]/30 pl-4">
            <div>
              <p className="font-mono text-[9px] text-[#ebbbb4]/30 uppercase tracking-widest">Total Qty</p>
              <p className="font-mono text-[14px] font-bold text-[#e2e2e2]">{filteredProductStats.qty}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] text-[#ebbbb4]/30 uppercase tracking-widest">Total Amount</p>
              <p className="font-mono text-[14px] font-bold text-primary">₱{filteredProductStats.total.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-8">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading orders…
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="text-center py-16 font-mono text-[13px] text-[#ebbbb4]/30">No orders found.</div>
      ) : (
        <div className="space-y-2">
          {visibleOrders.map((order) => {
            const facebookUrl = order.customer_id ? customerMap[order.customer_id]?.facebook_url ?? undefined : undefined;
            return (
            <div key={order.id} className="bg-[#1a1a1a] border border-[#603e39]/30 overflow-hidden">

              {/* ── Mobile layout (hidden on md+) ── */}
              <div className="md:hidden px-4 py-3">
                {/* Row 1: #number Name / Location / Items */}
                <div
                  className="cursor-pointer hover:opacity-80 transition-opacity mb-2"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <p className="font-inter font-bold text-[14px] text-[#e2e2e2] truncate">
                    {order.order_number != null && (
                      <span className="text-[#ebbbb4]/40 font-mono font-normal text-[12px] mr-1">#{order.order_number}</span>
                    )}
                    <CustomerNameLink order={order} facebookUrl={facebookUrl} />
                  </p>
                  <p className="font-mono text-[10px] text-[#ebbbb4]/30 mt-0.5">{formatDate(order.created_at)}</p>
                  {order.location && (
                    <p className="font-mono text-[11px] text-[#ebbbb4]/40 mt-0.5">{order.location}</p>
                  )}
                  {order.items.length > 0 && (
                    <div className="mt-0.5">
                      {order.items.map((it, i) => (
                        <p key={i} className="font-mono text-[10px] text-[#ebbbb4]/30 truncate">
                          {it.product} ×{it.qty}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 2: total · status badge · select · edit · delete */}
                <div className="flex items-center gap-2 flex-wrap">
                  <OrderTotalInline order={order} />
                  <span className={`font-mono text-[10px] tracking-widest uppercase px-2 py-1 border ${STATUS_COLORS[order.status] ?? "text-[#ebbbb4]/40"}`}>
                    {order.status}
                  </span>
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                    disabled={updating === order.id}
                    className="bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[11px] px-2 py-1 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <Link href={`/admin/orders/${order.id}`} className="text-[#ebbbb4]/40 hover:text-primary transition-colors" title="Edit order">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </Link>
                  {confirmDelete === order.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteOrder(order.id)} disabled={deleting === order.id} className="font-mono text-[10px] text-primary border border-primary/50 px-2 py-1 hover:bg-primary/10 transition-colors disabled:opacity-50">
                        {deleting === order.id ? "…" : "Yes"}
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="font-mono text-[10px] text-[#ebbbb4]/40 border border-[#603e39]/40 px-2 py-1 hover:text-[#e2e2e2] transition-colors">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(order.id)} className="text-[#ebbbb4]/30 hover:text-primary transition-colors" title="Delete order">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ── Desktop layout (hidden below md) ── */}
              <div
                className="hidden md:flex flex-wrap items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#222] transition-colors"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <span className="material-symbols-outlined text-[14px] text-[#ebbbb4]/30 flex-shrink-0">
                  {expanded === order.id ? "expand_less" : "expand_more"}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 truncate">
                    <p className="font-inter font-bold text-[14px] text-[#e2e2e2] truncate">
                      {order.order_number != null && (
                        <span className="text-[#ebbbb4]/40 font-mono font-normal text-[12px] mr-1">#{order.order_number}</span>
                      )}
                      <CustomerNameLink order={order} facebookUrl={facebookUrl} />
                    </p>
                    {order.location && (
                      <p className="font-mono text-[11px] text-[#ebbbb4]/40 flex-shrink-0">{order.location}</p>
                    )}
                  </div>
                  {order.items.length > 0 && (
                    <p className="font-mono text-[10px] text-[#ebbbb4]/30 truncate mt-0.5">
                      {order.items.map(it => `${it.product} ×${it.qty}`).join(" · ")}
                    </p>
                  )}
                </div>

                <div className="font-mono text-[11px] text-[#ebbbb4]/50 min-w-[140px]">
                  {formatDate(order.created_at)}
                </div>

                <div className="min-w-[90px] text-right">
                  <OrderTotalInline order={order} />
                </div>

                <span className={`font-mono text-[10px] tracking-widest uppercase px-2 py-1 border ${STATUS_COLORS[order.status] ?? "text-[#ebbbb4]/40"}`}>
                  {order.status}
                </span>

                <select
                  value={order.status}
                  onChange={(e) => { e.stopPropagation(); updateStatus(order.id, e.target.value as OrderStatus); }}
                  disabled={updating === order.id}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[11px] px-2 py-1 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                >
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>

                <Link
                  href={`/admin/orders/${order.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-[#ebbbb4]/40 hover:text-primary transition-colors flex-shrink-0"
                  title="Edit order"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </Link>

                {confirmDelete === order.id ? (
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => deleteOrder(order.id)} disabled={deleting === order.id} className="font-mono text-[10px] text-primary border border-primary/50 px-2 py-1 hover:bg-primary/10 transition-colors disabled:opacity-50">
                      {deleting === order.id ? "…" : "Yes"}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="font-mono text-[10px] text-[#ebbbb4]/40 border border-[#603e39]/40 px-2 py-1 hover:text-[#e2e2e2] transition-colors">No</button>
                  </div>
                ) : (
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(order.id); }} className="text-[#ebbbb4]/30 hover:text-primary transition-colors flex-shrink-0" title="Delete order">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>

              {expanded === order.id && (
                <div className="border-t border-[#603e39]/30 px-4 py-4 space-y-4 bg-[#161616]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12px]">
                    {[
                      { label: "Email", value: order.email },
                      { label: "Phone", value: order.phone },
                      { label: "Location", value: order.location },
                      { label: "Date", value: formatDate(order.created_at) },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest mb-0.5">{f.label}</p>
                        <p className="font-mono text-[12px] text-[#e2e2e2]">{f.value}</p>
                      </div>
                    ))}
                    {order.official_receipt && (
                      <div>
                        <p className="font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest mb-0.5">Official Receipt</p>
                        <p className="font-mono text-[12px] text-[#e2e2e2]">{order.official_receipt}</p>
                      </div>
                    )}
                    {order.delivery_method && (
                      <div>
                        <p className="font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest mb-0.5">Delivery</p>
                        <p className="font-mono text-[12px] text-[#e2e2e2]">{order.delivery_method}</p>
                      </div>
                    )}
                    {order.payment_method && (
                      <div>
                        <p className="font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest mb-0.5">Payment</p>
                        <p className="font-mono text-[12px] text-[#e2e2e2]">{order.payment_method}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest mb-2">Items</p>
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-[#603e39]/20">
                          <th className="text-left font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest pb-2">Product</th>
                          <th className="text-center font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest pb-2">Qty</th>
                          <th className="text-right font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest pb-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, i) => (
                          <tr key={i} className="border-b border-[#603e39]/10">
                            <td className="py-2 font-mono text-[#e2e2e2]">{item.product}</td>
                            <td className="py-2 text-center font-mono text-[#ebbbb4]/60">{item.qty}</td>
                            <td className="py-2 text-right font-mono text-primary">₱{item.subtotal.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-1 max-w-xs ml-auto">
                    {order.discount > 0 && (
                      <div className="flex justify-between font-mono text-[12px]">
                        <span className="text-[#ebbbb4]/50">Discount</span>
                        <span className="text-green-400">−₱{order.discount.toLocaleString()}</span>
                      </div>
                    )}
                    {order.status === "pre-order" && (order.down_payment ?? 0) > 0 && (
                      <div className="flex justify-between font-mono text-[12px]">
                        <span className="text-[#ebbbb4]/50">Down Payment</span>
                        <span className="text-blue-400">₱{(order.down_payment ?? 0).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-[#ebbbb4]/40 uppercase tracking-widest">
                        {order.status === "pre-order" && (order.down_payment ?? 0) > 0 ? "Remaining Balance" : "Total"}
                      </span>
                      <div className="text-right">
                        {order.status === "pre-order" && (order.down_payment ?? 0) > 0 && (
                          <p className="font-mono text-[12px] text-[#ebbbb4]/40 line-through">₱{order.estimated_total.toLocaleString()}</p>
                        )}
                        <span className="font-inter font-black text-[20px] text-primary">
                          ₱{(order.status === "pre-order" && (order.down_payment ?? 0) > 0
                            ? Math.max(0, order.estimated_total - (order.down_payment ?? 0))
                            : order.estimated_total
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-8">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading orders…
      </div>
    }>
      <AdminOrdersPageInner />
    </Suspense>
  );
}
