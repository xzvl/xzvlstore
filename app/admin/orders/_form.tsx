"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DbProduct, OrderStatus } from "@/lib/supabase";

const DELIVERY_METHODS = ["J&T Express", "LBC", "Shopee Express", "Grab Express", "Lalamove", "Pickup", "Other"];
const PAYMENT_METHODS = ["GCash", "Maya", "Bank Transfer", "Cash on Delivery", "Cash", "PayPal", "Other"];
const ALL_STATUSES: OrderStatus[] = ["pending", "pre-order", "processing", "confirmed", "shipped", "completed", "cancelled"];

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  billing_phone: string;
  billing_address_1: string;
  billing_address_2: string;
  billing_city: string;
  billing_state: string;
  billing_postcode: string;
  billing_region: string;
  shipping_address_1: string;
  shipping_address_2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postcode: string;
  shipping_region: string;
  shipping_phone: string;
};

type ItemRow = {
  product_id: string;
  product: string;
  qty: string;
  unit_price: string;
  subtotal: string;
};

type FormState = {
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: OrderStatus;
  order_date: string;
  delivery_method: string;
  payment_method: string;
  tracking_number: string;
  official_receipt: string;
  discount: string;
  down_payment: string;
  billing_address_1: string;
  billing_address_2: string;
  billing_city: string;
  billing_state: string;
  billing_postcode: string;
  billing_region: string;
  billing_phone: string;
  shipping_address_1: string;
  shipping_address_2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postcode: string;
  shipping_region: string;
  shipping_phone: string;
  items: ItemRow[];
  notes: string[];
};

const EMPTY_ITEM: ItemRow = { product_id: "", product: "", qty: "1", unit_price: "", subtotal: "" };

// Returns current time in Asia/Manila as a datetime-local string (YYYY-MM-DDTHH:mm)
function nowPH(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16);
}

// Converts a UTC ISO string to a datetime-local string in PH time
function toPHLocal(iso: string): string {
  return new Date(new Date(iso).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16);
}

const EMPTY_FORM: FormState = {
  customer_id: "", name: "", email: "", phone: "", location: "",
  status: "pending", order_date: nowPH(),
  delivery_method: "", payment_method: "", tracking_number: "",
  official_receipt: "", discount: "", down_payment: "",
  billing_address_1: "", billing_address_2: "", billing_city: "", billing_state: "",
  billing_postcode: "", billing_region: "Philippines", billing_phone: "",
  shipping_address_1: "", shipping_address_2: "", shipping_city: "", shipping_state: "",
  shipping_postcode: "", shipping_region: "Philippines", shipping_phone: "",
  items: [{ ...EMPTY_ITEM }],
  notes: [],
};

const INPUT = "w-full bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20";
const SELECT = "w-full bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors";
const LABEL = "block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5";

// ─── Customer Search Combobox ─────────────────────────────────────────────────

function CustomerSearch({
  customers,
  selectedId,
  onSelect,
}: {
  customers: Customer[];
  selectedId: string;
  onSelect: (c: Customer | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  const filtered = query.trim()
    ? customers.filter((c) => {
        const q = query.toLowerCase();
        return (
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      })
    : customers;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (c: Customer) => {
    onSelect(c);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {selected ? (
        <div className="flex items-center justify-between gap-3 bg-[#0e0e0e] border border-primary/40 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-[14px] flex-shrink-0">person</span>
            <div className="min-w-0">
              <p className="font-mono text-[12px] text-[#e2e2e2] truncate">
                {selected.first_name} {selected.last_name}
              </p>
              <p className="font-mono text-[10px] text-[#ebbbb4]/40 truncate">{selected.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 text-[#ebbbb4]/30 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-[#0e0e0e] border border-[#603e39] focus-within:border-primary transition-colors px-4">
          <span className="material-symbols-outlined text-[#ebbbb4]/30 text-[16px] flex-shrink-0">search</span>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="flex-1 bg-transparent text-[#e2e2e2] font-mono text-[13px] py-2.5 focus:outline-none placeholder:text-[#ebbbb4]/20"
          />
        </div>
      )}

      {open && !selected && (
        <div className="absolute top-full left-0 right-0 z-50 mt-px bg-[#161616] border border-[#603e39] max-h-[220px] overflow-y-auto shadow-xl shadow-black/60">
          {filtered.length === 0 ? (
            <div className="px-4 py-5 text-center font-mono text-[11px] text-[#ebbbb4]/30">
              No customers found.
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#2a2a2a] transition-colors border-b border-[#603e39]/20"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[12px] text-[#e2e2e2] truncate">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="font-mono text-[10px] text-[#ebbbb4]/40 truncate">{c.email}</p>
                </div>
                {c.billing_city && (
                  <span className="flex-shrink-0 font-mono text-[10px] text-[#ebbbb4]/30">{c.billing_city}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Address Section ──────────────────────────────────────────────────────────

function AddressSection({
  prefix,
  label,
  form,
  set$,
  extra,
}: {
  prefix: "billing" | "shipping";
  label: string;
  form: FormState;
  set$: (key: keyof FormState, value: string) => void;
  extra?: React.ReactNode;
}) {
  const f = (field: string) => `${prefix}_${field}` as keyof FormState;
  return (
    <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">{label}</p>
        {extra}
      </div>
      <div>
        <label className={LABEL}>Address Line 1</label>
        <input
          value={String(form[f("address_1")])}
          onChange={(e) => set$(f("address_1"), e.target.value)}
          placeholder="Street address"
          className={INPUT}
        />
      </div>
      <div>
        <label className={LABEL}>Address Line 2</label>
        <input
          value={String(form[f("address_2")])}
          onChange={(e) => set$(f("address_2"), e.target.value)}
          placeholder="Apt, unit, floor (optional)"
          className={INPUT}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>City</label>
          <input
            value={String(form[f("city")])}
            onChange={(e) => set$(f("city"), e.target.value)}
            placeholder="City"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>State / Province</label>
          <input
            value={String(form[f("state")])}
            onChange={(e) => set$(f("state"), e.target.value)}
            placeholder="Province"
            className={INPUT}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Postcode / ZIP</label>
          <input
            value={String(form[f("postcode")])}
            onChange={(e) => set$(f("postcode"), e.target.value)}
            placeholder="0000"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Region</label>
          <input
            value={String(form[f("region")])}
            onChange={(e) => set$(f("region"), e.target.value)}
            placeholder="Philippines"
            className={INPUT}
          />
        </div>
      </div>
      <div>
        <label className={LABEL}>Phone</label>
        <input
          value={String(form[f("phone")])}
          onChange={(e) => set$(f("phone"), e.target.value)}
          placeholder="+63 9XX XXX XXXX"
          className={INPUT}
        />
      </div>
    </div>
  );
}

// ─── Product Combobox ────────────────────────────────────────────────────────

function ProductCombobox({
  value,
  onChange,
  products,
}: {
  value: string;
  onChange: (id: string) => void;
  products: DbProduct[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = products.find((p) => p.id === value);
  const filtered = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : products;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={open ? query : (selected?.name ?? "")}
        placeholder="Search product…"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        className="w-full bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-3 py-2 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20"
      />
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-px bg-[#161616] border border-[#603e39] max-h-[200px] overflow-y-auto shadow-xl shadow-black/60">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 font-mono text-[11px] text-[#ebbbb4]/30 text-center">No products found.</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(p.id); setQuery(""); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left border-b border-[#603e39]/10 transition-colors ${
                  p.id === value ? "bg-primary/10 text-primary" : "text-[#e2e2e2] hover:bg-[#222]"
                }`}
              >
                <span className="font-mono text-[12px] truncate">{p.name}</span>
                <span className="font-mono text-[11px] text-[#ebbbb4]/40 flex-shrink-0">
                  ₱{(p.sale_price ?? p.price).toLocaleString()}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function OrderForm({ orderId }: { orderId?: string }) {
  const router = useRouter();
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!!orderId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [shippingCopied, setShippingCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/products").then((r) => r.json()).then(setProducts);
    fetch("/api/admin/customers").then((r) => r.json()).then(setCustomers);

    if (orderId) {
      fetch(`/api/admin/orders/${orderId}`)
        .then((r) => r.json())
        .then((order) => {
          setForm({
            customer_id: order.customer_id ?? "",
            name: order.name ?? "",
            email: order.email ?? "",
            phone: order.phone ?? "",
            location: order.location ?? "",
            status: order.status ?? "pending",
            order_date: order.created_at ? toPHLocal(order.created_at) : nowPH(),
            delivery_method: order.delivery_method ?? "",
            payment_method: order.payment_method ?? "",
            tracking_number: order.tracking_number ?? "",
            official_receipt: order.official_receipt ?? "",
            discount: order.discount ? String(order.discount) : "",
            down_payment: order.down_payment ? String(order.down_payment) : "",
            billing_address_1: order.billing_address_1 ?? "",
            billing_address_2: order.billing_address_2 ?? "",
            billing_city: order.billing_city ?? "",
            billing_state: order.billing_state ?? "",
            billing_postcode: order.billing_postcode ?? "",
            billing_region: order.billing_region || "Philippines",
            billing_phone: order.billing_phone ?? "",
            shipping_address_1: order.shipping_address_1 ?? "",
            shipping_address_2: order.shipping_address_2 ?? "",
            shipping_city: order.shipping_city ?? "",
            shipping_state: order.shipping_state ?? "",
            shipping_postcode: order.shipping_postcode ?? "",
            shipping_region: order.shipping_region || "Philippines",
            shipping_phone: order.shipping_phone ?? "",
            items: (order.items ?? []).map((it: Record<string, unknown>) => ({
              product_id: String(it.product_id ?? ""),
              product: String(it.product ?? ""),
              qty: String(it.qty ?? 1),
              unit_price: String(it.unit_price ?? 0),
              subtotal: String(it.subtotal ?? 0),
            })),
            notes: Array.isArray(order.notes) ? order.notes : [],
          });
          setLoading(false);
        });
    }
  }, [orderId]);

  const set$ = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleCustomerSelect = (c: Customer | null) => {
    if (!c) {
      setForm((f) => ({ ...f, customer_id: "" }));
      return;
    }
    const location = [c.billing_city, c.billing_state].filter(Boolean).join(", ");
    setForm((f) => ({
      ...f,
      customer_id: c.id,
      name: [c.first_name, c.last_name].filter(Boolean).join(" "),
      email: c.email,
      phone: c.billing_phone,
      location,
      billing_address_1: c.billing_address_1,
      billing_address_2: c.billing_address_2,
      billing_city: c.billing_city,
      billing_state: c.billing_state,
      billing_postcode: c.billing_postcode,
      billing_region: c.billing_region || "Philippines",
      billing_phone: c.billing_phone,
      shipping_address_1: c.shipping_address_1,
      shipping_address_2: c.shipping_address_2,
      shipping_city: c.shipping_city,
      shipping_state: c.shipping_state,
      shipping_postcode: c.shipping_postcode,
      shipping_region: c.shipping_region || "Philippines",
      shipping_phone: c.shipping_phone,
    }));
  };

  const copyBillingToShipping = () => {
    setForm((f) => ({
      ...f,
      shipping_address_1: f.billing_address_1,
      shipping_address_2: f.billing_address_2,
      shipping_city: f.billing_city,
      shipping_state: f.billing_state,
    }));
  };

  const copyShippingAddress = () => {
    const text = [form.shipping_address_1, form.shipping_address_2, form.shipping_city, form.shipping_state]
      .filter(Boolean)
      .join(", ");
    navigator.clipboard.writeText(text);
    setShippingCopied(true);
    setTimeout(() => setShippingCopied(false), 1500);
  };

  const setItem = (i: number, key: keyof ItemRow, value: string) =>
    setForm((f) => {
      const items = [...f.items];
      const updated = { ...items[i], [key]: value };
      if (key === "qty" || key === "unit_price") {
        const qty = parseFloat(key === "qty" ? value : updated.qty) || 0;
        const price = parseFloat(key === "unit_price" ? value : updated.unit_price) || 0;
        if (qty > 0 && price > 0) updated.subtotal = String(qty * price);
      }
      items[i] = updated;
      return { ...f, items };
    });

  const selectProduct = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    setForm((f) => {
      const items = [...f.items];
      const qty = parseFloat(items[i].qty) || 1;
      const price = p ? (p.sale_price ?? p.price) : 0;
      items[i] = {
        product_id: productId,
        product: p?.name ?? "",
        qty: String(qty),
        unit_price: String(price),
        subtotal: String(qty * price),
      };
      return { ...f, items };
    });
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const itemsSubtotal = form.items.reduce((s, it) => s + (parseFloat(it.subtotal) || 0), 0);
  const discountAmt = parseFloat(form.discount) || 0;
  const total = Math.max(0, itemsSubtotal - discountAmt);

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        customer_id: form.customer_id || null,
        name: form.name, email: form.email, phone: form.phone, location: form.location,
        status: form.status,
        created_at: form.order_date ? new Date(form.order_date + ":00+08:00").toISOString() : undefined,
        delivery_method: form.delivery_method || null,
        payment_method: form.payment_method || null,
        tracking_number: form.tracking_number || null,
        official_receipt: form.official_receipt || null,
        discount: discountAmt,
        down_payment: Number(form.down_payment) || 0,
        estimated_total: total,
        billing_address_1: form.billing_address_1,
        billing_address_2: form.billing_address_2,
        billing_city: form.billing_city,
        billing_state: form.billing_state,
        billing_postcode: form.billing_postcode,
        billing_region: form.billing_region,
        billing_phone: form.billing_phone,
        shipping_address_1: form.shipping_address_1,
        shipping_address_2: form.shipping_address_2,
        shipping_city: form.shipping_city,
        shipping_state: form.shipping_state,
        shipping_postcode: form.shipping_postcode,
        shipping_region: form.shipping_region,
        shipping_phone: form.shipping_phone,
        items: form.items.map((it) => ({
          product_id: it.product_id || null,
          product: it.product,
          qty: parseInt(it.qty) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
          subtotal: parseFloat(it.subtotal) || 0,
        })),
        notes: form.notes.length > 0 ? form.notes : null,
      };
      const res = await fetch(
        orderId ? `/api/admin/orders/${orderId}` : "/api/admin/orders",
        { method: orderId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save order.");
      router.push("/admin/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-12">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/orders" className="inline-flex items-center gap-1 font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors mb-3">
            <span className="material-symbols-outlined text-[13px]">arrow_back</span>
            Back to Orders
          </Link>
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
            ADMIN // ORDERS / {orderId ? "EDIT" : "NEW"}
          </p>
          <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">
            {orderId ? "Edit Order" : "New Order"}
          </h1>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/20 transition-colors disabled:opacity-50 flex-shrink-0 mt-8"
        >
          {saving
            ? <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
            : <span className="material-symbols-outlined text-[14px]">save</span>
          }
          {saving ? "Saving…" : "Save Order"}
        </button>
      </div>

      {/* Customer selector */}
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5 space-y-4">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Customer</p>

        <div>
          <label className={LABEL}>Select Customer</label>
          <CustomerSearch
            customers={customers}
            selectedId={form.customer_id}
            onSelect={handleCustomerSelect}
          />
          <p className="mt-1.5 font-mono text-[10px] text-[#ebbbb4]/30">
            Selecting a customer will auto-fill contact and address fields.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div>
            <label className={LABEL}>Name <span className="text-primary">*</span></label>
            <input value={form.name} onChange={(e) => set$("name", e.target.value)} placeholder="Full name" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input value={form.email} onChange={(e) => set$("email", e.target.value)} placeholder="email@example.com" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Phone</label>
            <input value={form.phone} onChange={(e) => set$("phone", e.target.value)} placeholder="+63 9XX XXX XXXX" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Location</label>
            <input value={form.location} onChange={(e) => set$("location", e.target.value)} placeholder="City, Province" className={INPUT} />
          </div>
        </div>
      </div>

      {/* Billing & Shipping */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AddressSection prefix="billing" label="Billing Address" form={form} set$={set$} />
        <AddressSection
          prefix="shipping"
          label="Shipping Address"
          form={form}
          set$={set$}
          extra={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyShippingAddress}
                title="Copy shipping address"
                className="flex items-center gap-1 font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[12px]">
                  {shippingCopied ? "check" : "content_copy"}
                </span>
                {shippingCopied ? "Copied!" : "Copy"}
              </button>
              <span className="w-px h-3 bg-[#603e39]/40" />
              <button
                type="button"
                onClick={copyBillingToShipping}
                title="Fill with billing address"
                className="flex items-center gap-1 font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[12px]">content_paste</span>
                Same as billing
              </button>
            </div>
          }
        />
      </div>

      {/* Order Details */}
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5 space-y-4">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Order Details</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Official Receipt</label>
            <input value={form.official_receipt} onChange={(e) => set$("official_receipt", e.target.value)} placeholder="OR number" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Status</label>
            <select value={form.status} onChange={(e) => set$("status", e.target.value)} className={SELECT}>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Order Date &amp; Time</label>
            <input
              type="datetime-local"
              value={form.order_date ?? ""}
              onChange={(e) => set$("order_date", e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Discount (₱)</label>
            <input value={form.discount} onChange={(e) => set$("discount", e.target.value)} placeholder="0" type="number" min="0" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Down Payment (₱)</label>
            <input value={form.down_payment} onChange={(e) => set$("down_payment", e.target.value)} placeholder="0" type="number" min="0" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Payment Method</label>
            <select value={form.payment_method} onChange={(e) => set$("payment_method", e.target.value)} className={SELECT}>
              <option value="">— Select —</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Delivery Method</label>
            <select value={form.delivery_method} onChange={(e) => set$("delivery_method", e.target.value)} className={SELECT}>
              <option value="">— Select —</option>
              {DELIVERY_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Tracking Number</label>
            <input value={form.tracking_number} onChange={(e) => set$("tracking_number", e.target.value)} placeholder="Waybill / tracking no." className={INPUT} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Items</p>
          <button type="button" onClick={addItem} className="flex items-center gap-1 font-mono text-[10px] text-[#ebbbb4]/50 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[13px]">add</span>
            Add item
          </button>
        </div>

        <div className="hidden md:grid grid-cols-[1fr_70px_110px_110px_32px] gap-3 mb-2">
          {["Product", "Qty", "Unit Price (₱)", "Subtotal", ""].map((h, i) => (
            <p key={i} className="font-mono text-[10px] uppercase tracking-widest text-[#ebbbb4]/40">{h}</p>
          ))}
        </div>

        <div className="space-y-2">
          {form.items.map((item, i) => (
            <div key={i} className="relative" style={{ zIndex: form.items.length - i }}>
              {/* Mobile layout */}
              <div className="md:hidden bg-[#0e0e0e] border border-[#603e39]/40 p-3 space-y-2">
                <ProductCombobox value={item.product_id} onChange={(id) => selectProduct(i, id)} products={products} />
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="font-mono text-[9px] text-[#ebbbb4]/40 uppercase tracking-widest mb-1">Qty</p>
                    <input value={item.qty} onChange={(e) => setItem(i, "qty", e.target.value)} type="number" min="1"
                      className="w-full bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-2 py-1.5 focus:outline-none focus:border-primary transition-colors text-center" />
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-[9px] text-[#ebbbb4]/40 uppercase tracking-widest mb-1">Unit (₱)</p>
                    <input value={item.unit_price} onChange={(e) => setItem(i, "unit_price", e.target.value)} type="number" min="0" placeholder="0"
                      className="w-full bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-2 py-1.5 focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-[9px] text-[#ebbbb4]/40 uppercase tracking-widest mb-1">Subtotal</p>
                    <p className="font-mono text-[13px] text-primary font-bold px-1 py-1.5">₱{(parseFloat(item.subtotal) || 0).toLocaleString()}</p>
                  </div>
                  <button type="button" onClick={() => removeItem(i)} disabled={form.items.length === 1}
                    className="flex-shrink-0 text-[#ebbbb4]/30 hover:text-primary transition-colors disabled:opacity-20 mt-4">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
              {/* Desktop layout */}
              <div className="hidden md:grid grid-cols-[1fr_70px_110px_110px_32px] gap-3 items-center">
                <ProductCombobox value={item.product_id} onChange={(id) => selectProduct(i, id)} products={products} />
                <input value={item.qty} onChange={(e) => setItem(i, "qty", e.target.value)} type="number" min="1"
                  className="bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-3 py-2 focus:outline-none focus:border-primary transition-colors text-center" />
                <input value={item.unit_price} onChange={(e) => setItem(i, "unit_price", e.target.value)} type="number" min="0" placeholder="0"
                  className="bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-3 py-2 focus:outline-none focus:border-primary transition-colors" />
                <div className="font-mono text-[13px] text-primary font-bold px-1">
                  ₱{(parseFloat(item.subtotal) || 0).toLocaleString()}
                </div>
                <button type="button" onClick={() => removeItem(i)} disabled={form.items.length === 1}
                  className="text-[#ebbbb4]/30 hover:text-primary transition-colors disabled:opacity-20">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[#603e39]/20 space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between font-mono text-[12px]">
            <span className="text-[#ebbbb4]/50">Subtotal</span>
            <span className="text-[#e2e2e2]">₱{itemsSubtotal.toLocaleString()}</span>
          </div>
          {discountAmt > 0 && (
            <div className="flex justify-between font-mono text-[12px]">
              <span className="text-[#ebbbb4]/50">Discount</span>
              <span className="text-green-400">−₱{discountAmt.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-[#603e39]/20">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#ebbbb4]/50">Total</span>
            <span className="font-inter font-black text-[22px] text-primary">₱{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Order Notes</p>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, notes: [...f.notes, ""] }))}
            className="flex items-center gap-1 font-mono text-[10px] text-[#ebbbb4]/50 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[13px]">add</span>
            Add note
          </button>
        </div>
        {form.notes.length === 0 ? (
          <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {form.notes.map((note, i) => (
              <div key={i} className="flex items-start gap-2">
                <textarea
                  value={note}
                  onChange={(e) => setForm((f) => {
                    const notes = [...f.notes];
                    notes[i] = e.target.value;
                    return { ...f, notes };
                  })}
                  rows={2}
                  placeholder={`Note ${i + 1}…`}
                  className="flex-1 bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-3 py-2 focus:outline-none focus:border-primary transition-colors resize-y placeholder:text-[#ebbbb4]/20"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, notes: f.notes.filter((_, idx) => idx !== i) }))}
                  className="flex-shrink-0 text-[#ebbbb4]/30 hover:text-primary transition-colors mt-1"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="font-mono text-[11px] text-red-400">{error}</p>}

      {/* Bottom save button */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {saving
            ? <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
            : <span className="material-symbols-outlined text-[14px]">save</span>
          }
          {saving ? "Saving…" : "Save Order"}
        </button>
      </div>
    </div>
  );
}
