"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PRODUCTS, type Product } from "@/lib/products";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductRow = {
  id: string;
  productId: string;
  qty: number;
};

type ContactForm = {
  name: string;
  location: string;
  phone: string;
  email: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const inputClass =
  "w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/30";

const labelClass =
  "block font-mono text-[11px] tracking-[0.15em] uppercase text-[#ebbbb4]/70 mb-2";

const sectionTitle = (tag: string, title: string) => (
  <div className="mb-6">
    <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-1">
      {tag}
    </p>
    <h2 className="font-inter font-bold text-[20px] text-[#e2e2e2] uppercase">
      {title}
    </h2>
    <div className="mt-3 h-px bg-[#603e39]/40" />
  </div>
);

// ─── Custom Product Dropdown ──────────────────────────────────────────────────

function ProductDropdown({
  value,
  onChange,
  onOpenChange,
}: {
  value: string;
  onChange: (productId: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = PRODUCTS.find((p) => p.id === value);

  const toggle = (next: boolean) => {
    setOpen(next);
    onOpenChange(next);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        toggle(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => toggle(!open)}
        className={`w-full flex items-center justify-between gap-2 bg-[#1f1f1f] border text-left px-4 font-mono text-[13px] transition-colors cursor-pointer ${
          open ? "border-primary" : "border-[#603e39] hover:border-[#ebbbb4]/40"
        }`}
        style={{ paddingTop: "0.6rem", paddingBottom: "0.6rem" }}
      >
        <span
          className={`truncate ${selected ? "text-[#e2e2e2]" : "text-[#ebbbb4]/30"}`}
        >
          {selected ? selected.name : "Select product…"}
        </span>
        <span
          className={`material-symbols-outlined flex-shrink-0 text-[18px] transition-transform duration-200 ${
            open ? "rotate-180 text-primary" : "text-[#ebbbb4]/40"
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-px bg-[#161616] border border-[#603e39] max-h-[220px] overflow-y-auto shadow-xl shadow-black/60">
          {PRODUCTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p.id);
                toggle(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors border-b border-[#603e39]/20 last:border-0 ${
                p.id === value
                  ? "bg-primary/10 text-primary"
                  : "text-[#e2e2e2] hover:bg-[#2a2a2a]"
              }`}
            >
              <span className="font-mono text-[12px] leading-tight">{p.name}</span>
              <span className="flex-shrink-0 font-mono text-[12px] text-[#ebbbb4]/60">
                ₱{p.price.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Product Row Component ────────────────────────────────────────────────────

function ProductRowInput({
  row,
  index,
  onProductChange,
  onQtyChange,
  onRemove,
  canRemove,
}: {
  row: ProductRow;
  index: number;
  onProductChange: (id: string, productId: string) => void;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    // Raise z-index of the whole row when its dropdown is open so the panel
    // clears rows below (backdrop-filter creates a new stacking context per row).
    <div
      className="flex items-end gap-3 glass-panel p-4 glitch-hover transition-all"
      style={{ position: "relative", zIndex: dropdownOpen ? 10 : undefined }}
    >
      <div className="flex-shrink-0 font-mono text-[10px] text-primary/60 w-5 pt-6">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="flex-1">
        <label className={labelClass}>Product</label>
        <ProductDropdown
          value={row.productId}
          onChange={(productId) => onProductChange(row.id, productId)}
          onOpenChange={setDropdownOpen}
        />
      </div>

      <div className="w-24">
        <label className={labelClass}>Qty</label>
        <input
          type="number"
          min={1}
          max={999}
          value={row.qty}
          onChange={(e) =>
            onQtyChange(row.id, Math.max(1, parseInt(e.target.value) || 1))
          }
          className={inputClass}
          required
        />
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="mb-0.5 flex-shrink-0 w-10 h-[46px] flex items-center justify-center border border-[#603e39]/60 text-[#ebbbb4]/40 hover:border-primary hover:text-primary transition-colors"
          aria-label="Remove row"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}

// ─── Order Summary ────────────────────────────────────────────────────────────

function OrderSummary({ rows }: { rows: ProductRow[] }) {
  const filledRows = rows.filter((r) => r.productId);

  if (filledRows.length === 0) return null;

  const estimatedTotal = filledRows.reduce((sum, row) => {
    const product = PRODUCTS.find((p) => p.id === row.productId);
    return sum + (product ? product.price * row.qty : 0);
  }, 0);

  return (
    <div className="space-y-3">
      {filledRows.map((row) => {
        const product = PRODUCTS.find((p) => p.id === row.productId)!;
        const subtotal = product.price * row.qty;
        return (
          <div
            key={row.id}
            className="flex items-center gap-4 glass-panel p-4"
          >
            <div className="flex-shrink-0 w-[60px] h-[60px] relative border border-[#603e39]/30 overflow-hidden">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-inter font-bold text-[14px] text-[#e2e2e2] leading-tight">
                {product.name}
                <span className="text-[#ebbbb4]/60 font-normal">
                  {" "}
                  × {row.qty}
                </span>
              </p>
              <p className="font-mono text-[11px] text-[#ebbbb4]/50 mt-0.5">
                ₱{product.price.toLocaleString()} each
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="font-mono text-[13px] text-primary font-bold">
                ₱{subtotal.toLocaleString()}
              </p>
              <p className="font-mono text-[10px] text-[#ebbbb4]/40">
                subtotal
              </p>
            </div>
          </div>
        );
      })}

      {/* Totals */}
      <div className="border border-[#603e39]/40 p-4 space-y-3 mt-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] tracking-widest text-[#ebbbb4]/60 uppercase">
            Shipping Fee
          </span>
          <span className="font-mono text-[13px] text-[#ebbbb4]/60 italic">
            TBA
          </span>
        </div>
        <div className="h-px bg-[#603e39]/30" />
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[12px] tracking-widest text-[#e2e2e2] uppercase">
              Estimated Total
            </span>
            <p className="font-mono text-[10px] text-[#ebbbb4]/40 mt-0.5">
              Shipping fee not yet included
            </p>
          </div>
          <span className="font-inter font-black text-[22px] text-primary">
            ₱{estimatedTotal.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PreOrderPage() {
  const [contact, setContact] = useState<ContactForm>({
    name: "",
    location: "",
    phone: "",
    email: "",
  });

  const [rows, setRows] = useState<ProductRow[]>([
    { id: uid(), productId: "", qty: 1 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const setContact$ = (field: keyof ContactForm, value: string) =>
    setContact((prev) => ({ ...prev, [field]: value }));

  const addRow = () =>
    setRows((prev) => [...prev, { id: uid(), productId: "", qty: 1 }]);

  const updateProductId = (id: string, productId: string) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, productId } : r))
    );

  const updateQty = (id: string, qty: number) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, qty } : r)));

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const filledRows = rows.filter((r) => r.productId);
    if (filledRows.length === 0) {
      setError("Please select at least one product.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const orderItems = filledRows.map((r) => {
        const p = PRODUCTS.find((p) => p.id === r.productId)!;
        return { product: p.name, qty: r.qty, subtotal: p.price * r.qty };
      });

      const estimatedTotal = orderItems.reduce((s, i) => s + i.subtotal, 0);

      const payload = {
        ...contact,
        items: orderItems,
        estimatedTotal,
      };

      // Replace this URL with your actual webhook / API route
      const res = await fetch("/api/pre-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit order.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#131313] cyber-grid flex flex-col items-center justify-center px-4">
        <div className="glass-panel max-w-md w-full p-10 flex flex-col items-center text-center gap-6 animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[32px]">
              check_circle
            </span>
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-widest text-primary mb-2">
              ORDER_RECEIVED
            </p>
            <h2 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">
              Pre-Order Sent!
            </h2>
            <p className="font-mono text-[13px] text-[#ebbbb4]/60 mt-3 leading-relaxed">
              We received your pre-order, {contact.name}. We&apos;ll reach out
              to you via{" "}
              <span className="text-primary">{contact.email || contact.phone}</span>{" "}
              to confirm the details.
            </p>
          </div>
          <Link
            href="/"
            className="px-8 py-3 bg-primary text-white font-mono text-[12px] tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#131313] cyber-grid pb-24">
      {/* Header */}
      <div className="border-b border-[#603e39]/30 px-4 md:px-16 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-[#e2e2e2]/60 hover:text-primary transition-colors font-mono text-[12px] tracking-widest uppercase"
        >
          <span className="material-symbols-outlined text-[16px]">
            arrow_back
          </span>
          Back
        </Link>
        <span className="font-mono text-[11px] tracking-widest text-[#ebbbb4]/40 uppercase">
          xzvl.store
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-14">
        {/* Page title */}
        <div className="mb-12 animate-fade-up">
          <p className="font-mono text-[11px] tracking-[0.2em] text-primary mb-2">
            XZVL_STORE // PRE_ORDER
          </p>
          <h1 className="font-inter font-black text-[40px] md:text-[56px] uppercase leading-none text-[#e2e2e2]">
            Pre-Order
            <br />
            <span className="text-primary italic">Form</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-12">
          {/* ── Contact Info ── */}
          <section className="animate-fade-up" style={{ animationDelay: "80ms" }}>
            {sectionTitle("SECTION_01", "Contact Information")}
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>
                    Name <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Juan dela Cruz"
                    value={contact.name}
                    onChange={(e) => setContact$("name", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Location <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="City, Province"
                    value={contact.location}
                    onChange={(e) => setContact$("location", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>
                    Phone <span className="text-primary">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+63 9XX XXX XXXX"
                    value={contact.phone}
                    onChange={(e) => setContact$("phone", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Email <span className="text-primary">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={contact.email}
                    onChange={(e) => setContact$("email", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── Products ── */}
          <section className="animate-fade-up z-10 relative" style={{ animationDelay: "160ms" }}>
            {sectionTitle("SECTION_02", "Product Selection")}
            <div className="space-y-3">
              {rows.map((row, i) => (
                <ProductRowInput
                  key={row.id}
                  row={row}
                  index={i}
                  onProductChange={updateProductId}
                  onQtyChange={updateQty}
                  onRemove={removeRow}
                  canRemove={rows.length > 1}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-4 flex items-center gap-2 px-5 py-3 border border-[#603e39]/60 text-[#ebbbb4]/60 hover:border-primary hover:text-primary font-mono text-[12px] tracking-widest uppercase transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add More
            </button>
          </section>

          {/* ── Order Summary ── */}
          {rows.some((r) => r.productId) && (
            <section className="animate-fade-up z-9 relative" style={{ animationDelay: "240ms" }}>
              {sectionTitle("SECTION_03", "Order Summary")}
              <OrderSummary rows={rows} />
            </section>
          )}

          {/* ── Error ── */}
          {error && (
            <p className="flex items-center gap-2 font-mono text-[13px] text-error">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </p>
          )}

          {/* ── Submit ── */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-12 py-4 bg-primary text-white font-mono text-[12px] tracking-[0.15em] uppercase hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              <span className="material-symbols-outlined text-[18px]">
                {submitting ? "hourglass_empty" : "send"}
              </span>
              {submitting ? "Submitting…" : "Submit Pre-Order"}
            </button>
            <p className="mt-3 font-mono text-[11px] text-[#ebbbb4]/40">
              We&apos;ll contact you to confirm your order and provide payment details.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
