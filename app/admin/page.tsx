"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Order, DbProduct } from "@/lib/supabase";

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

type LedgerEntry = {
  id: string;
  type: "incoming" | "outgoing";
  amount: number;
  entry_date: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  "pre-order": "text-purple-400 border-purple-400/30 bg-purple-400/10",
  processing: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  confirmed: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  shipped: "text-green-400 border-green-400/30 bg-green-400/10",
  completed: "text-primary border-primary/30 bg-primary/10",
  cancelled: "text-[#ebbbb4]/40 border-[#ebbbb4]/20 bg-[#ebbbb4]/5",
};

const QUICK_LINKS = [
  { href: "/admin/orders", label: "Orders", icon: "receipt_long" },
  { href: "/admin/products", label: "Products", icon: "inventory_2" },
  { href: "/admin/customers", label: "Customers", icon: "group" },
  { href: "/admin/ledger", label: "Ledger", icon: "account_balance_wallet" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
  { href: "/admin/taxonomy", label: "Taxonomy", icon: "account_tree" },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<DbProduct[]>([]);
  const [ledgerThisMonth, setLedgerThisMonth] = useState({ incoming: 0, outgoing: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/orders").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/products").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/ledger").then((r) => (r.ok ? r.json() : [])),
    ]).then(([statsData, orders, products, ledger]: [Stats, Order[], DbProduct[], LedgerEntry[]]) => {
      setStats(statsData);
      setRecentOrders((orders ?? []).slice(0, 5));
      setLowStock((products ?? []).filter((p) => p.status === "active" && p.stock <= 5).slice(0, 5));

      const now = new Date();
      const monthEntries = (ledger ?? []).filter((e) => {
        const d = new Date(e.entry_date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
      setLedgerThisMonth({
        incoming: monthEntries.filter((e) => e.type === "incoming").reduce((s, e) => s + e.amount, 0),
        outgoing: monthEntries.filter((e) => e.type === "outgoing").reduce((s, e) => s + e.amount, 0),
      });
      setLoading(false);
    });
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", {
      month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
    });

  const balance = ledgerThisMonth.incoming - ledgerThisMonth.outgoing;

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-12">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-1 uppercase">ADMIN // DASHBOARD</p>
        <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">Dashboard</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Orders", value: stats.totalOrders, icon: "receipt_long" },
            { label: "Total Revenue", value: `₱${stats.totalRevenue.toLocaleString()}`, icon: "payments" },
            { label: "Pending", value: stats.pendingOrders, icon: "hourglass_empty" },
            { label: "Pre-Order", value: stats.preOrderOrders, icon: "schedule" },
            { label: "Shipped", value: stats.shippedOrders, icon: "local_shipping" },
            { label: "Completed", value: stats.completedOrders, icon: "task_alt" },
            { label: "Cancelled", value: stats.cancelledOrders, icon: "cancel" },
            { label: "Active Products", value: stats.activeProducts, icon: "inventory_2" },
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent orders */}
        <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Recent Orders</p>
            <Link href="/admin/orders" className="font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors">
              View all →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#0e0e0e] border border-[#603e39]/20 hover:border-primary/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[12px] text-[#e2e2e2] truncate">{o.name}</p>
                    <p className="font-mono text-[10px] text-[#ebbbb4]/30">{formatDate(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 border ${STATUS_COLORS[o.status] ?? "text-[#ebbbb4]/40"}`}>
                      {o.status}
                    </span>
                    <span className="font-mono text-[12px] text-primary font-bold">₱{o.estimated_total.toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Low stock + ledger */}
        <div className="space-y-4">
          <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Low Stock</p>
              <Link href="/admin/products" className="font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors">
                View all →
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">Nothing low on stock.</p>
            ) : (
              <div className="space-y-2">
                {lowStock.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/products/${p.id}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 bg-[#0e0e0e] border border-[#603e39]/20 hover:border-primary/40 transition-colors"
                  >
                    <p className="font-mono text-[12px] text-[#e2e2e2] truncate">{p.name}</p>
                    <span className={`font-mono text-[12px] font-bold flex-shrink-0 ${p.stock === 0 ? "text-primary" : "text-yellow-400"}`}>
                      {p.stock}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5 space-y-2">
            <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Ledger This Month</p>
            <div className="flex items-center justify-between font-mono text-[12px]">
              <span className="text-[#ebbbb4]/50">Incoming</span>
              <span className="text-green-400 font-bold">₱{ledgerThisMonth.incoming.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[12px]">
              <span className="text-[#ebbbb4]/50">Outgoing</span>
              <span className="text-red-400 font-bold">₱{ledgerThisMonth.outgoing.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[12px] pt-2 border-t border-[#603e39]/20">
              <span className="text-[#ebbbb4]/50 uppercase tracking-widest text-[10px]">Balance</span>
              <span className={`font-bold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                {balance < 0 ? "−" : ""}₱{Math.abs(balance).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex flex-col items-center justify-center gap-2 py-5 bg-[#1a1a1a] border border-[#603e39]/30 hover:border-primary/50 transition-colors text-[#ebbbb4]/60 hover:text-primary"
          >
            <span className="material-symbols-outlined text-[22px]">{l.icon}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
