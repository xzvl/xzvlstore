"use client";

import { useEffect, useState } from "react";
import type { DbProduct, Order, OrderStatus } from "@/lib/supabase";
import {
  ALL_STATUSES,
  DELIVERY_METHODS,
  PAYMENT_METHODS,
  ProductCombobox,
  fromPHLocal,
  toPHLocal,
} from "./_form";

type ItemRow = {
  product_id: string;
  product: string;
  qty: string;
  unit_price: string;
  subtotal: string;
};

const LABEL = "block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/40 mb-1";
const FIELD =
  "w-full bg-[#0e0e0e] border border-[#603e39]/40 text-[#e2e2e2] font-mono text-[12px] px-3 py-2 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20";
const CELL =
  "w-full bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-2 py-1.5 focus:outline-none focus:border-primary transition-colors";

const toRows = (order: Order): ItemRow[] =>
  (order.items ?? []).map((it) => ({
    product_id: it.product_id ?? "",
    product: it.product ?? "",
    qty: String(it.qty ?? 1),
    unit_price: String(it.unit_price ?? 0),
    subtotal: String(it.subtotal ?? 0),
  }));

// A stored value that isn't in the preset list (e.g. legacy data) still needs to
// be selectable, otherwise the <select> would silently blank it out on save.
const withCurrent = (options: string[], current: string) =>
  current && !options.includes(current) ? [current, ...options] : options;

export function OrderQuickEditModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: (updated: Order) => void;
}) {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [receipt, setReceipt] = useState(order.official_receipt ?? "");
  const [status, setStatus] = useState<OrderStatus>(order.status);
  // Unlinked = the admin picked a payment date; linked = still "same as order date".
  const [paymentLinked, setPaymentLinked] = useState(!order.payment_date);
  const [paymentDate, setPaymentDate] = useState(toPHLocal(order.payment_date ?? order.created_at));
  const [paymentMethod, setPaymentMethod] = useState(order.payment_method ?? "");
  const [deliveryMethod, setDeliveryMethod] = useState(order.delivery_method ?? "");
  const [shippingFee, setShippingFee] = useState(order.shipping_fee != null ? String(order.shipping_fee) : "");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [items, setItems] = useState<ItemRow[]>(() => toRows(order));
  const [notes, setNotes] = useState<string[]>(Array.isArray(order.notes) ? order.notes : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => (r.ok ? r.json() : []))
      .then(setProducts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setItem = (i: number, key: keyof ItemRow, value: string) =>
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[i], [key]: value };
      if (key === "qty" || key === "unit_price") {
        const qty = parseFloat(updated.qty) || 0;
        const price = parseFloat(updated.unit_price) || 0;
        if (qty > 0 && price > 0) updated.subtotal = String(qty * price);
      }
      next[i] = updated;
      return next;
    });

  const selectProduct = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    setItems((prev) => {
      const next = [...prev];
      const qty = parseFloat(next[i].qty) || 1;
      const price = p ? (p.sale_price ?? p.price) : 0;
      next[i] = {
        product_id: productId,
        product: p?.name ?? "",
        qty: String(qty),
        unit_price: String(price),
        subtotal: String(qty * price),
      };
      return next;
    });
  };

  const itemsChanged = JSON.stringify(items) !== JSON.stringify(toRows(order));
  const itemsSubtotal = items.reduce((s, it) => s + (parseFloat(it.subtotal) || 0), 0);
  const total = Math.max(0, itemsSubtotal - (order.discount ?? 0));

  const isPickup = deliveryMethod === "Pickup";
  const invalid =
    (!isPickup && shippingFee.trim() !== "" && !(Number(shippingFee) >= 0)) ||
    items.length === 0 ||
    items.some((it) => !it.product.trim() || !(parseInt(it.qty) >= 1));

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      official_receipt: receipt.trim() || null,
      status,
      payment_method: paymentMethod || null,
      delivery_method: deliveryMethod || null,
      shipping_fee: isPickup || shippingFee.trim() === "" ? null : Number(shippingFee),
      tracking_number: tracking.trim() || null,
      notes: notes.map((n) => n.trim()).filter(Boolean),
    };
    if (!paymentLinked && paymentDate) body.payment_date = fromPHLocal(paymentDate);
    // Only touch items/total when they were edited — the API re-syncs stock on any items write.
    if (itemsChanged) {
      body.items = items.map((it) => ({
        product_id: it.product_id || null,
        product: it.product,
        qty: parseInt(it.qty) || 1,
        unit_price: parseFloat(it.unit_price) || 0,
        subtotal: parseFloat(it.subtotal) || 0,
      }));
      body.estimated_total = total;
    }

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to save changes.");

      // The PATCH response has no thumbnails (they're attached on list reads), so
      // carry them over from the product list / the previous row.
      const updated = json as Order;
      const imageFor = (id?: string | null) => {
        if (!id) return null;
        const p = products.find((x) => x.id === id);
        return p ? (p.main_image ?? (p.image || null)) : (order.items.find((it) => it.product_id === id)?.image ?? null);
      };
      onSaved({ ...updated, items: (updated.items ?? []).map((it) => ({ ...it, image: imageFor(it.product_id) })) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border border-[#603e39]/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#603e39]/30 px-5 py-3 sticky top-0 bg-[#1a1a1a] z-[60]">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Quick Edit</p>
            <p className="font-mono text-[11px] text-[#ebbbb4]/40 truncate">
              {order.order_number != null ? `#${order.order_number} · ` : ""}{order.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-[#ebbbb4]/40 hover:text-primary transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Order details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="qe-or">Official Receipt</label>
              <input id="qe-or" value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="OR number" className={FIELD} />
            </div>
            <div>
              <label className={LABEL} htmlFor="qe-status">Status</label>
              <select id="qe-status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className={FIELD}>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="qe-paydate">Payment Date &amp; Time</label>
              <input
                id="qe-paydate"
                type="datetime-local"
                value={paymentDate}
                onChange={(e) => { setPaymentLinked(false); setPaymentDate(e.target.value); }}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="qe-paymethod">Payment Method</label>
              <select id="qe-paymethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={FIELD}>
                <option value="">— Select —</option>
                {withCurrent(PAYMENT_METHODS, paymentMethod).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="qe-delivery">Delivery Method</label>
              <select id="qe-delivery" value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} className={FIELD}>
                <option value="">— Select —</option>
                {withCurrent(DELIVERY_METHODS, deliveryMethod).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {!isPickup && (
              <div>
                <label className={LABEL} htmlFor="qe-ship">Shipping Fee (₱)</label>
                <input id="qe-ship" type="number" min="0" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} placeholder="TBA" className={FIELD} />
              </div>
            )}
            <div className={isPickup ? "" : "sm:col-span-2"}>
              <label className={LABEL} htmlFor="qe-track">Tracking Number</label>
              <input id="qe-track" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Waybill / tracking no." className={FIELD} />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Items</p>
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, { product_id: "", product: "", qty: "1", unit_price: "", subtotal: "" }])}
                className="flex items-center gap-1 font-mono text-[10px] text-[#ebbbb4]/50 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">add</span>
                Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="relative bg-[#141414] border border-[#603e39]/30 p-3 space-y-2" style={{ zIndex: items.length - i }}>
                  <ProductCombobox
                    value={item.product_id}
                    onChange={(id) => selectProduct(i, id)}
                    products={products}
                    fallbackLabel={item.product}
                  />
                  <div className="flex items-end gap-2">
                    <div className="w-16">
                      <p className="font-mono text-[9px] text-[#ebbbb4]/40 uppercase tracking-widest mb-1">Qty</p>
                      <input type="number" min="1" value={item.qty} onChange={(e) => setItem(i, "qty", e.target.value)} className={`${CELL} text-center`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-mono text-[9px] text-[#ebbbb4]/40 uppercase tracking-widest mb-1">Unit (₱)</p>
                      <input type="number" min="0" placeholder="0" value={item.unit_price} onChange={(e) => setItem(i, "unit_price", e.target.value)} className={CELL} />
                    </div>
                    <div className="flex-1">
                      <p className="font-mono text-[9px] text-[#ebbbb4]/40 uppercase tracking-widest mb-1">Subtotal</p>
                      <p className="font-mono text-[13px] text-primary font-bold py-1.5">₱{(parseFloat(item.subtotal) || 0).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={items.length === 1}
                      className="flex-shrink-0 pb-2 text-[#ebbbb4]/30 hover:text-primary transition-colors disabled:opacity-20"
                      title="Remove item"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {itemsChanged && (
              <div className="flex justify-between items-baseline pt-3 mt-3 border-t border-[#603e39]/20">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#ebbbb4]/50">
                  New total{(order.discount ?? 0) > 0 ? " (after discount)" : ""}
                </span>
                <span className="font-inter font-black text-[18px] text-primary">₱{total.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Order Notes</p>
              <button
                type="button"
                onClick={() => setNotes((prev) => [...prev, ""])}
                className="flex items-center gap-1 font-mono text-[10px] text-[#ebbbb4]/50 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">add</span>
                Add note
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">No notes yet.</p>
            ) : (
              <div className="space-y-2">
                {notes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <textarea
                      value={note}
                      onChange={(e) => setNotes((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))}
                      rows={2}
                      placeholder={`Note ${i + 1}…`}
                      className={`${FIELD} resize-y flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => setNotes((prev) => prev.filter((_, idx) => idx !== i))}
                      className="flex-shrink-0 text-[#ebbbb4]/30 hover:text-primary transition-colors mt-1"
                      title="Remove note"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="font-mono text-[11px] text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#603e39]/30 px-5 py-3 sticky bottom-0 bg-[#1a1a1a] z-[60]">
          <button
            onClick={onClose}
            className="px-4 py-2 font-mono text-[11px] tracking-widest uppercase text-[#ebbbb4]/40 hover:text-[#e2e2e2] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || invalid}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white font-mono text-[11px] tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {saving && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
