"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import type { Order } from "@/lib/supabase";
import { fullAddress } from "./page";

const LABEL = "block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5";

export type ExportFormat = "xlsx" | "csv";
export type ExportMode = "orders" | "products";

// ─── Field definitions ─────────────────────────────────────────────────────

const ORDER_FIELDS: { key: string; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "address", label: "Full Address" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
  { key: "date", label: "Date" },
  { key: "products", label: "Product(s)" },
  { key: "quantity", label: "Quantity" },
  { key: "subtotal", label: "Sub Total" },
];

const PRODUCT_FIELDS: { key: string; label: string }[] = [
  { key: "product", label: "Product Name" },
  { key: "quantity", label: "Total Quantity" },
  { key: "subtotal", label: "Sub Total" },
];

function fieldsForMode(mode: ExportMode) {
  return mode === "orders" ? ORDER_FIELDS : PRODUCT_FIELDS;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
  });
}

// Items belonging to an order, narrowed to the currently active product filter (if any) —
// so the export only reflects the products being filtered on the page.
function relevantItems(order: Order, productFilter: string) {
  return productFilter === "all" ? order.items : order.items.filter((it) => it.product === productFilter);
}

// ─── Row builders ───────────────────────────────────────────────────────────

function buildOrderRows(orders: Order[], fields: string[], productFilter: string) {
  const activeFields = ORDER_FIELDS.filter((f) => fields.includes(f.key));
  const header = activeFields.map((f) => f.label);
  const rows = orders.map((o) => {
    const items = relevantItems(o, productFilter);
    const values: Record<string, string | number> = {
      name: o.name,
      address: fullAddress(o),
      phone: o.phone,
      location: o.location,
      date: fmtDate(o.created_at),
      products: items.map((it) => `${it.product} x${it.qty}`).join("; "),
      quantity: items.reduce((s, it) => s + it.qty, 0),
      subtotal: items.reduce((s, it) => s + it.subtotal, 0),
    };
    return activeFields.map((f) => values[f.key]);
  });
  return { header, rows };
}

function buildProductRows(orders: Order[], fields: string[], productFilter: string) {
  const agg = new Map<string, { qty: number; subtotal: number }>();
  for (const o of orders) {
    for (const it of relevantItems(o, productFilter)) {
      const cur = agg.get(it.product) ?? { qty: 0, subtotal: 0 };
      cur.qty += it.qty;
      cur.subtotal += it.subtotal;
      agg.set(it.product, cur);
    }
  }
  const activeFields = PRODUCT_FIELDS.filter((f) => fields.includes(f.key));
  const header = activeFields.map((f) => f.label);
  const rows = Array.from(agg.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([product, { qty, subtotal }]) => {
      const values: Record<string, string | number> = { product, quantity: qty, subtotal };
      return activeFields.map((f) => values[f.key]);
    });
  return { header, rows };
}

// ─── File writers ───────────────────────────────────────────────────────────

function toCsv(header: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = toCsv(header, rows);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadXlsx(filename: string, header: string[], rows: (string | number)[][], sheetName: string) {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

function runExport(opts: {
  orders: Order[];
  mode: ExportMode;
  format: ExportFormat;
  fields: string[];
  productFilter: string;
}) {
  const { orders, mode, format, fields, productFilter } = opts;
  const { header, rows } =
    mode === "orders"
      ? buildOrderRows(orders, fields, productFilter)
      : buildProductRows(orders, fields, productFilter);

  const stamp = new Date().toISOString().slice(0, 10);
  const base = `orders-${mode === "orders" ? "list" : "product-summary"}-${stamp}`;

  if (format === "csv") downloadCsv(`${base}.csv`, header, rows);
  else downloadXlsx(`${base}.xlsx`, header, rows, mode === "orders" ? "Orders" : "Products");
}

// ─── Modal ──────────────────────────────────────────────────────────────────

export function ExportOrdersModal({
  open,
  onClose,
  orders,
  productFilter,
}: {
  open: boolean;
  onClose: () => void;
  orders: Order[];
  productFilter: string;
}) {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [mode, setMode] = useState<ExportMode>("orders");
  const [orderFields, setOrderFields] = useState<string[]>(ORDER_FIELDS.map((f) => f.key));
  const [productFields, setProductFields] = useState<string[]>(PRODUCT_FIELDS.map((f) => f.key));

  if (!open) return null;

  const selected = mode === "orders" ? orderFields : productFields;
  const setSelected = mode === "orders" ? setOrderFields : setProductFields;

  const toggleField = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleExport = () => {
    if (selected.length === 0 || orders.length === 0) return;
    runExport({ orders, mode, format, fields: selected, productFilter });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#131313] border border-[#603e39]/60 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#603e39]/30">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Orders // Export</p>
            <h2 className="font-inter font-black text-[18px] uppercase text-[#e2e2e2]">Export Orders</h2>
          </div>
          <button onClick={onClose} className="text-[#ebbbb4]/30 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <p className="font-mono text-[11px] text-[#ebbbb4]/40">
            Exports the <span className="text-[#e2e2e2]">{orders.length}</span> order{orders.length === 1 ? "" : "s"} matching your current filters.
          </p>
          {productFilter !== "all" && (
            <p className="font-mono text-[11px] text-primary/80 flex items-start gap-1.5">
              <span className="material-symbols-outlined text-[13px] flex-shrink-0">filter_alt</span>
              Only “{productFilter}” line items will be included.
            </p>
          )}

          {/* Format */}
          <div>
            <label className={LABEL}>File Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(["xlsx", "csv"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`px-4 py-2.5 font-mono text-[11px] tracking-widest uppercase border transition-colors ${
                    format === f
                      ? "border-primary text-primary bg-primary/10"
                      : "border-[#603e39] text-[#ebbbb4]/50 hover:text-[#e2e2e2]"
                  }`}
                >
                  {f === "xlsx" ? "Excel (.xlsx)" : "CSV (.csv)"}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className={LABEL}>Export As</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMode("orders")}
                className={`w-full text-left px-4 py-3 border transition-colors ${
                  mode === "orders" ? "border-primary bg-primary/10" : "border-[#603e39] hover:bg-[#1a1a1a]"
                }`}
              >
                <p className={`font-mono text-[12px] uppercase tracking-widest ${mode === "orders" ? "text-primary" : "text-[#e2e2e2]"}`}>
                  Order List
                </p>
                <p className="font-mono text-[10px] text-[#ebbbb4]/40 mt-0.5">
                  One row per order — customer, shipping &amp; order details.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("products")}
                className={`w-full text-left px-4 py-3 border transition-colors ${
                  mode === "products" ? "border-primary bg-primary/10" : "border-[#603e39] hover:bg-[#1a1a1a]"
                }`}
              >
                <p className={`font-mono text-[12px] uppercase tracking-widest ${mode === "products" ? "text-primary" : "text-[#e2e2e2]"}`}>
                  Product Summary
                </p>
                <p className="font-mono text-[10px] text-[#ebbbb4]/40 mt-0.5">
                  Totals combined across all orders, one row per product.
                </p>
              </button>
            </div>
          </div>

          {/* Fields */}
          <div>
            <label className={LABEL}>Columns to Include</label>
            <div className="grid grid-cols-2 gap-2">
              {fieldsForMode(mode).map((f) => (
                <label key={f.key} className="flex items-center gap-2 font-mono text-[11px] text-[#e2e2e2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(f.key)}
                    onChange={() => toggleField(f.key)}
                    className="accent-primary w-3.5 h-3.5"
                  />
                  {f.label}
                </label>
              ))}
            </div>
            {selected.length === 0 && (
              <p className="font-mono text-[10px] text-red-400 mt-2">Select at least one column.</p>
            )}
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-[#603e39]/30 flex items-center justify-end gap-3">
          <button onClick={onClose} className="font-mono text-[11px] text-[#ebbbb4]/50 hover:text-[#e2e2e2] transition-colors px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selected.length === 0 || orders.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
