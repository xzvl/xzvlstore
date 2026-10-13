"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import type { Order } from "@/lib/supabase";

type LedgerEntry = {
  id: string;
  title: string;
  source: string;
  type: "incoming" | "outgoing";
  amount: number;
  entry_date: string;
};

type EntryKind = "custom" | "order" | "dp";

// A ledger row: either a custom entry from the ledger table, or a read-only
// entry derived from an order (completed sale, or a pre-order's down payment).
type Row = LedgerEntry & { kind: EntryKind; order?: Order };

type FormState = {
  title: string;
  source: string;
  type: "incoming" | "outgoing";
  amount: string;
  entry_date: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const now = new Date();

const ORDER_SOURCE = "Facebook / Website";

const KIND_FILTERS: { value: "all" | "orders" | "custom"; label: string }[] = [
  { value: "all", label: "All Entries" },
  { value: "orders", label: "Orders Only" },
  { value: "custom", label: "Custom Entry" },
];

function orderShippingFee(o: Order): number {
  return o.delivery_method && o.delivery_method !== "Pickup" ? (o.shipping_fee ?? 0) : 0;
}

// "#123 Juan (SKU-1, SKU-2)" — the DP prefix is rendered separately so it can be highlighted.
function orderLabel(o: Order, skuById: Map<string, string>): string {
  const num = o.order_number != null ? `#${o.order_number}` : `#${o.id.slice(0, 8)}`;
  const firstName = o.name.trim().split(/\s+/)[0] ?? "";
  const skus = Array.from(new Set(
    o.items.map(it => (it.product_id ? skuById.get(it.product_id) : undefined)).filter(Boolean) as string[]
  ));
  return `${num} ${firstName}${skus.length ? ` (${skus.join(", ")})` : ""}`;
}

// Completed orders count in full (total + shipping); pre-orders count only
// their down payment, dated by payment date (falls back to the order date).
function ordersToRows(orders: Order[], skuById: Map<string, string>): Row[] {
  return orders.flatMap((o): Row[] => {
    const date = o.payment_date ?? o.created_at;
    if (o.status === "completed") {
      return [{
        id: `order-${o.id}`, kind: "order", order: o,
        title: orderLabel(o, skuById), source: ORDER_SOURCE, type: "incoming",
        amount: o.estimated_total + orderShippingFee(o), entry_date: date,
      }];
    }
    if (o.status === "pre-order" && (o.down_payment ?? 0) > 0) {
      return [{
        id: `dp-${o.id}`, kind: "dp", order: o,
        title: orderLabel(o, skuById), source: ORDER_SOURCE, type: "incoming",
        amount: o.down_payment, entry_date: date,
      }];
    }
    return [];
  });
}

function RowTitle({ row }: { row: Row }) {
  return (
    <>
      {row.kind === "dp" && (
        <span className="inline-flex items-center tabular-nums text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded bg-amber-400/15 text-amber-400 border border-amber-400/40 mr-1.5 align-middle">
          DP
        </span>
      )}
      {row.title}
    </>
  );
}

const INPUT = "w-full bg-deep border border-line text-fg tabular-nums text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-accent/40 rounded-md focus:ring-2 focus:ring-primary/20";
const LABEL = "block tabular-nums text-[10px] uppercase text-accent/60 mb-1.5 tracking-wider font-medium";
const SELECT = "w-full bg-deep border border-line text-fg tabular-nums text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors rounded-md focus:ring-2 focus:ring-primary/20";

// Returns current time in Asia/Manila as a datetime-local string (YYYY-MM-DDTHH:mm)
function nowPH(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16);
}

// Converts a UTC ISO string to a datetime-local string in PH time
function toPHLocal(iso: string): string {
  return new Date(new Date(iso).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16);
}

function emptyForm(): FormState {
  return {
    title: "",
    source: "",
    type: "incoming",
    amount: "",
    entry_date: nowPH(),
  };
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()));
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterKind, setFilterKind] = useState<"all" | "orders" | "custom">("all");

  const [viewOrder, setViewOrder] = useState<Row | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    const json = (url: string) => fetch(url, { cache: "no-store" }).then(r => r.json()).catch(() => []);
    const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []);
    Promise.all([
      json("/api/admin/ledger"),
      json("/api/admin/orders?status=completed"),
      json("/api/admin/orders?status=pre-order"),
      json("/api/admin/products"),
    ]).then(([ledger, completed, preOrders, products]) => {
      const skuById = new Map<string, string>(
        arr<{ id: string; sku: string | null }>(products)
          .filter(p => p.sku?.trim())
          .map(p => [p.id, p.sku!.trim()])
      );
      const custom: Row[] = arr<LedgerEntry>(ledger).map(e => ({ ...e, kind: "custom" }));
      const orderRows = ordersToRows([...arr<Order>(completed), ...arr<Order>(preOrders)], skuById);
      setEntries(
        [...custom, ...orderRows].sort(
          (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
        )
      );
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  // Filtered entries
  const filtered = entries.filter(e => {
    const d = new Date(e.entry_date);
    const monthMatch = filterMonth === "all" || d.getMonth() + 1 === Number(filterMonth);
    const yearMatch = filterYear === "" || d.getFullYear() === Number(filterYear);
    const typeMatch = filterType === "all" || e.type === filterType;
    const sourceMatch = filterSource === "all" || e.source === filterSource;
    const kindMatch =
      filterKind === "all" ||
      (filterKind === "custom" ? e.kind === "custom" : e.kind !== "custom");
    return monthMatch && yearMatch && typeMatch && sourceMatch && kindMatch;
  });

  const sources = Array.from(new Set(entries.map(e => e.source).filter(Boolean))).sort();

  const totalIncoming = filtered.filter(e => e.type === "incoming").reduce((s, e) => s + e.amount, 0);
  const totalOutgoing = filtered.filter(e => e.type === "outgoing").reduce((s, e) => s + e.amount, 0);
  const balance = totalIncoming - totalOutgoing;

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (entry: Row) => {
    setEditing(entry);
    setForm({
      title: entry.title,
      source: entry.source,
      type: entry.type,
      amount: String(entry.amount),
      entry_date: toPHLocal(entry.entry_date),
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const set$ = (key: keyof FormState, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    if (!form.amount || isNaN(Number(form.amount))) { setFormError("Enter a valid amount."); return; }
    setSaving(true);
    setFormError("");
    const payload = {
      title: form.title.trim(),
      source: form.source.trim(),
      type: form.type,
      amount: Number(form.amount),
      entry_date: form.entry_date ? new Date(form.entry_date + ":00+08:00").toISOString() : new Date().toISOString(),
    };
    const res = await fetch(
      editing ? `/api/admin/ledger/${editing.id}` : "/api/admin/ledger",
      { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    const json = await res.json();
    if (!res.ok) { setFormError(json.error ?? "Failed to save."); setSaving(false); return; }
    setSaving(false);
    closeModal();
    load();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/admin/ledger/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmId(null);
    load();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
    });

  const years = Array.from(
    new Set(entries.map(e => new Date(e.entry_date).getFullYear()))
  ).sort((a, b) => b - a);
  if (!years.includes(now.getFullYear())) years.unshift(now.getFullYear());

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-fg text-[22px] tracking-tight">Ledger</h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary border border-primary text-white tabular-nums text-[11px] hover:bg-primary/90 transition-colors font-medium shadow-sm"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add Entry
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-panel border border-line/30 p-5 rounded-lg">
          <div className="flex items-center gap-1.5 tabular-nums text-[10px] text-green-400/70 uppercase mb-2 tracking-wider font-medium">
            <span className="material-symbols-outlined text-[13px]">arrow_downward</span>
            Total Incoming
          </div>
          <p className="font-semibold text-green-400 text-[22px] tracking-tight">₱{totalIncoming.toLocaleString("en-US")}</p>
        </div>
        <div className="bg-panel border border-line/30 p-5 rounded-lg">
          <div className="flex items-center gap-1.5 tabular-nums text-[10px] text-red-400/70 uppercase mb-2 tracking-wider font-medium">
            <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
            Total Outgoing
          </div>
          <p className="font-semibold text-red-400 text-[22px] tracking-tight">₱{totalOutgoing.toLocaleString("en-US")}</p>
        </div>
        <div className="bg-panel border border-line/30 p-5 rounded-lg">
          <div className="flex items-center gap-1.5 tabular-nums text-[10px] text-accent/70 uppercase mb-2 tracking-wider font-medium">
            <span className="material-symbols-outlined text-[13px]">account_balance</span>
            Balance
          </div>
          <p className={` font-semibold text-[22px] tracking-tight ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
            {balance < 0 ? "−" : ""}₱{Math.abs(balance).toLocaleString("en-US")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex bg-panel border border-line/40 rounded-lg p-0.5">
          {KIND_FILTERS.map(k => (
            <button
              key={k.value}
              onClick={() => setFilterKind(k.value)}
              className={`tabular-nums text-[12px] px-3 py-1.5 rounded-md transition-colors font-medium ${
                filterKind === k.value ? "bg-primary text-white shadow-sm" : "text-accent/70 hover:text-fg"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="bg-panel border border-line/40 text-fg tabular-nums text-[12px] px-4 py-2 focus:outline-none focus:border-primary transition-colors rounded-lg focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Months</option>
          {MONTHS.map((m, i) => (
            <option key={i} value={String(i + 1)}>{m}</option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          className="bg-panel border border-line/40 text-fg tabular-nums text-[12px] px-4 py-2 focus:outline-none focus:border-primary transition-colors rounded-lg focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Years</option>
          {years.map(y => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-panel border border-line/40 text-fg tabular-nums text-[12px] px-4 py-2 focus:outline-none focus:border-primary transition-colors rounded-lg focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Types</option>
          <option value="incoming">Incoming</option>
          <option value="outgoing">Outgoing</option>
        </select>
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className="bg-panel border border-line/40 text-fg tabular-nums text-[12px] px-4 py-2 focus:outline-none focus:border-primary transition-colors rounded-lg focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Source</option>
          {sources.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="tabular-nums text-[11px] text-accent/50">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 tabular-nums text-[12px] text-accent/60 py-8">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-panel border border-line/20 p-12 text-center rounded-lg">
          <span className="material-symbols-outlined text-[32px] text-accent/40 block mb-3">account_balance_wallet</span>
          <p className="tabular-nums text-[12px] text-accent/50">No entries for this period.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards (hidden on md+) ── */}
          <div className="md:hidden space-y-2">
            {filtered.map(entry => (
              <div
                key={entry.id}
                onClick={entry.order ? () => setViewOrder(entry) : undefined}
                className={`bg-panel border rounded-lg ${entry.order ? "cursor-pointer" : ""} ${
                  entry.kind === "dp" ? "border-amber-400/40" : "border-line/20"
                }`}
              >
                <div className="px-4 py-3 space-y-1">
                  {/* Row 1: title */}
                  <p className="font-semibold text-[13px] text-fg truncate"><RowTitle row={entry} /></p>

                  {/* Row 2: source | date and time */}
                  <p className="tabular-nums text-[11px] text-accent/60 flex items-center gap-1.5">
                    <span>{entry.source || "—"}</span>
                    <span className="text-line/60">|</span>
                    <span>{formatDate(entry.entry_date)}</span>
                  </p>

                  {/* Row 3: type | amount | pencil | trash */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className={`inline-flex items-center gap-1 tabular-nums text-[9px] uppercase border px-1.5 py-px tracking-wider font-medium rounded ${
                      entry.type === "incoming"
                        ? "text-green-400 border-green-400/30 bg-green-400/10"
                        : "text-red-400 border-red-400/30 bg-red-400/10"
                    }`}>
                      <span className="material-symbols-outlined text-[10px]">
                        {entry.type === "incoming" ? "arrow_downward" : "arrow_upward"}
                      </span>
                      {entry.type}
                    </span>
                    <span className="text-line/60 tabular-nums text-[11px]">|</span>
                    <span className={`tabular-nums font-bold text-[13px] ${entry.type === "incoming" ? "text-green-400" : "text-red-400"}`}>
                      {entry.type === "outgoing" ? "−" : "+"}₱{entry.amount.toLocaleString("en-US")}
                    </span>
                    <span className="flex-1" />
                    {entry.order ? (
                      <span className="material-symbols-outlined text-[16px] text-accent/40" title="View order">receipt_long</span>
                    ) : (
                      <>
                        <button onClick={() => openEdit(entry)} className="text-accent/50 hover:text-primary transition-colors" title="Edit">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button onClick={() => setConfirmId(confirmId === entry.id ? null : entry.id)} className="text-accent/50 hover:text-red-400 transition-colors" title="Delete">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete confirmation */}
                {confirmId === entry.id && (
                  <div className="border-t border-red-900/30 bg-red-500/[0.06] px-4 py-3">
                    <p className="tabular-nums text-[11px] text-red-300 mb-2">
                      Delete <span className="text-white">{entry.title}</span>? Cannot be undone.
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setConfirmId(null)} className="tabular-nums text-[11px] text-accent/70 hover:text-fg transition-colors">Cancel</button>
                      <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id} className="flex items-center gap-1.5 px-3 py-1 bg-red-600/20 border border-red-600/50 text-red-400 tabular-nums text-[11px] hover:bg-red-600/30 transition-colors disabled:opacity-50 font-medium">
                        {deletingId === entry.id ? <span className="material-symbols-outlined animate-spin text-[13px]">progress_activity</span> : <span className="material-symbols-outlined text-[13px]">delete</span>}
                        {deletingId === entry.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Desktop table (hidden below md) ── */}
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line/40">
                {["Title", "Source", "Type", "Amount", "Date", ""].map((h, i) => (
                  <th key={i} className={`text-left tabular-nums text-[10px] uppercase text-accent/60 px-3 py-3 whitespace-nowrap tracking-wider font-medium ${i >= 3 ? "text-right" : "text-left"} ${i === 0 ? "w-[240px]" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <Fragment key={entry.id}>
                  <tr
                    onClick={entry.order ? () => setViewOrder(entry) : undefined}
                    className={`border-b border-line/15 hover:bg-panel transition-colors ${entry.order ? "cursor-pointer" : ""} ${
                      entry.kind === "dp" ? "bg-amber-400/[0.05]" : ""
                    }`}
                  >
                    <td className="px-3 py-3 font-semibold text-[13px] text-fg max-w-[240px] truncate" title={entry.kind === "dp" ? `DP ${entry.title}` : entry.title}>
                      <RowTitle row={entry} />
                    </td>
                    <td className="px-3 py-3 tabular-nums text-[12px] text-accent/60 whitespace-nowrap">
                      {entry.source || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 tabular-nums text-[10px] uppercase border px-2 py-0.5 tracking-wider font-medium rounded ${
                        entry.type === "incoming"
                          ? "text-green-400 border-green-400/30 bg-green-400/10"
                          : "text-red-400 border-red-400/30 bg-red-400/10"
                      }`}>
                        <span className="material-symbols-outlined text-[11px]">
                          {entry.type === "incoming" ? "arrow_downward" : "arrow_upward"}
                        </span>
                        {entry.type}
                      </span>
                    </td>
                    <td className={`px-3 py-3 tabular-nums font-bold text-[13px] text-right whitespace-nowrap ${
                      entry.type === "incoming" ? "text-green-400" : "text-red-400"
                    }`}>
                      {entry.type === "outgoing" ? "−" : "+"}₱{entry.amount.toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-[11px] text-accent/60 text-right whitespace-nowrap">
                      {formatDate(entry.entry_date)}
                    </td>
                    <td className="px-3 py-3">
                      {entry.order ? (
                        <div className="flex items-center justify-end p-1.5 text-accent/40" title="View order">
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(entry)}
                            className="p-1.5 text-accent/50 hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => setConfirmId(confirmId === entry.id ? null : entry.id)}
                            className="p-1.5 text-accent/50 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {confirmId === entry.id && (
                    <tr className="border-b border-line/15 bg-red-500/[0.06]">
                      <td colSpan={6} className="px-5 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <p className="tabular-nums text-[11px] text-red-300">
                            Delete <span className="text-white">{entry.title}</span>? This cannot be undone.
                          </p>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <button onClick={() => setConfirmId(null)} className="tabular-nums text-[11px] text-accent/70 hover:text-fg transition-colors">
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={deletingId === entry.id}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600/20 border border-red-600/50 text-red-400 tabular-nums text-[11px] hover:bg-red-600/30 transition-colors disabled:opacity-50 font-medium"
                            >
                              {deletingId === entry.id
                                ? <span className="material-symbols-outlined animate-spin text-[13px]">progress_activity</span>
                                : <span className="material-symbols-outlined text-[13px]">delete</span>
                              }
                              {deletingId === entry.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {/* Order details */}
      {viewOrder?.order && (
        <OrderModal row={viewOrder} order={viewOrder.order} onClose={() => setViewOrder(null)} formatDate={formatDate} />
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div
            ref={modalRef}
            className="w-full max-w-md bg-canvas border border-line/60 shadow-2xl rounded-lg"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line/30">
              <div>
                <p className="tabular-nums text-[13px] font-semibold text-fg">
                  {editing ? "Edit Entry" : "New Entry"}
                </p>
                <h2 className="font-semibold text-[18px] text-fg font-medium">
                  {editing ? editing.title : "Add Ledger Entry"}
                </h2>
              </div>
              <button onClick={closeModal} className="text-accent/50 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={LABEL}>Title <span className="text-red-400">*</span></label>
                <input
                  value={form.title}
                  onChange={e => set$("title", e.target.value)}
                  placeholder="e.g. Product Sale, Shipping Fee"
                  className={INPUT}
                  autoFocus
                />
              </div>
              <div>
                <label className={LABEL}>Source</label>
                <input
                  value={form.source}
                  onChange={e => set$("source", e.target.value)}
                  placeholder="e.g. GCash, Bank, Customer name"
                  className={INPUT}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Type <span className="text-red-400">*</span></label>
                  <select value={form.type} onChange={e => set$("type", e.target.value as "incoming" | "outgoing")} className={SELECT}>
                    <option value="incoming">Incoming</option>
                    <option value="outgoing">Outgoing</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Amount (₱) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => set$("amount", e.target.value)}
                    placeholder="0.00"
                    className={INPUT}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL}>Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={form.entry_date ?? ""}
                  onChange={e => set$("entry_date", e.target.value)}
                  className={INPUT}
                />
              </div>

              {formError && (
                <p className="tabular-nums text-[11px] text-red-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">error</span>
                  {formError}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-line/30 flex items-center justify-end gap-3">
              <button onClick={closeModal} className="tabular-nums text-[11px] text-accent/70 hover:text-fg transition-colors px-4 py-2">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary border border-primary text-white tabular-nums text-[11px] hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium shadow-sm"
              >
                {saving
                  ? <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                  : <span className="material-symbols-outlined text-[14px]">save</span>
                }
                {saving ? "Saving…" : editing ? "Update" : "Add Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderModal({
  row, order, onClose, formatDate,
}: {
  row: Row;
  order: Order;
  onClose: () => void;
  formatDate: (iso: string) => string;
}) {
  const shippingFee = orderShippingFee(order);
  const discount = order.discount ?? 0;
  const downPayment = order.down_payment ?? 0;
  const itemsTotal = order.items.reduce((s, it) => s + it.subtotal, 0);
  const grandTotal = order.estimated_total + shippingFee;
  const peso = (n: number) => `₱${n.toLocaleString("en-US")}`;

  const details: [string, string][] = [
    ["Customer", order.name],
    ["Status", order.status],
    ["Order Date", formatDate(order.created_at)],
    ["Payment Date", formatDate(order.payment_date ?? order.created_at)],
    ["Payment Method", order.payment_method || "—"],
    ["Delivery", order.delivery_method || "—"],
    ["Phone", order.phone || "—"],
    ["Email", order.email || "—"],
  ];
  if (order.official_receipt) details.push(["Official Receipt", order.official_receipt]);
  if (order.tracking_number) details.push(["Tracking #", order.tracking_number]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-canvas border border-line/60 shadow-2xl rounded-lg"
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-line/30">
          <div className="min-w-0">
            <p className="tabular-nums text-[13px] font-semibold text-fg">
              {row.kind === "dp" ? "Pre-order Down Payment" : "Completed Order"}
            </p>
            <h2 className="font-semibold text-[18px] text-fg truncate"><RowTitle row={row} /></h2>
          </div>
          <button onClick={onClose} className="text-accent/50 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {details.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className={LABEL}>{k}</dt>
                <dd className="text-[13px] text-fg break-words">{v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <p className={LABEL}>Items</p>
            <div className="border border-line/30 rounded-md divide-y divide-line/20">
              {order.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                  <span className="text-fg min-w-0 truncate">{it.product} <span className="text-accent/60">×{it.qty}</span></span>
                  <span className="tabular-nums text-fg whitespace-nowrap">{peso(it.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 tabular-nums text-[12px]">
            <div className="flex justify-between text-accent/70"><span>Items</span><span>{peso(itemsTotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-accent/70"><span>Discount</span><span>−{peso(discount)}</span></div>}
            {shippingFee > 0 && <div className="flex justify-between text-accent/70"><span>Shipping Fee</span><span>{peso(shippingFee)}</span></div>}
            <div className="flex justify-between text-fg font-semibold"><span>Total</span><span>{peso(grandTotal)}</span></div>
            {downPayment > 0 && (
              <div className={`flex justify-between ${row.kind === "dp" ? "text-amber-400 font-semibold" : "text-accent/70"}`}>
                <span>Down Payment</span><span>{peso(downPayment)}</span>
              </div>
            )}
            {row.kind === "dp" && (
              <div className="flex justify-between text-accent/70">
                <span>Remaining Balance</span><span>{peso(Math.max(0, grandTotal - downPayment))}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-line/30 flex items-center justify-end gap-3">
          <button onClick={onClose} className="tabular-nums text-[11px] text-accent/70 hover:text-fg transition-colors px-4 py-2">
            Close
          </button>
          <Link
            href={`/admin/orders/${order.id}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary border border-primary text-white tabular-nums text-[11px] hover:bg-primary/90 transition-colors font-medium shadow-sm"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            Open Order
          </Link>
        </div>
      </div>
    </div>
  );
}
