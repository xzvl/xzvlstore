"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PRODUCTS as FALLBACK_PRODUCTS, type Product } from "@/lib/products";
import { supabaseClient } from "@/lib/supabase-client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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

const inputClass = (hasError = false) =>
  `w-full bg-[#1f1f1f] border ${hasError ? "border-primary" : "border-[#603e39]"} text-[#e2e2e2] font-mono text-[13px] px-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/30`;

const labelClass =
  "block font-mono text-[11px] tracking-[0.15em] uppercase text-[#ebbbb4]/70 mb-2";

// ─── Validators ──────────────────────────────────────────────────────────────

const validateEmail = (v: string) => {
  if (!v) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Enter a valid email address.";
  return "";
};

const validatePhone = (v: string) => {
  if (!v) return "Phone is required.";
  const digits = v.replace(/[\s\-().+]/g, "");
  if (!/^(09\d{9}|639\d{9})$/.test(digits)) return "Enter a valid PH mobile number (e.g. 09XX XXX XXXX).";
  return "";
};

const sectionTitle = (tag: string, title: string) => (
  <div className="mb-6">
    <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-1">{tag}</p>
    <h2 className="font-inter font-bold text-[20px] text-[#e2e2e2] uppercase">{title}</h2>
    <div className="mt-3 h-px bg-[#603e39]/40" />
  </div>
);

// ─── Custom Product Dropdown ──────────────────────────────────────────────────

function ProductDropdown({
  value,
  onChange,
  onOpenChange,
  products,
  excludeIds = [],
}: {
  value: string;
  onChange: (productId: string) => void;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  excludeIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = products.find((p) => p.id === value);
  const availableProducts = products.filter((p) => !excludeIds.includes(p.id));

  const toggle = (next: boolean) => {
    setOpen(next);
    onOpenChange(next);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) toggle(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => toggle(!open)}
        className={`w-full flex items-start justify-between gap-2 bg-[#1f1f1f] border text-left px-4 font-mono text-[13px] transition-colors cursor-pointer ${
          open ? "border-primary" : "border-[#603e39] hover:border-[#ebbbb4]/40"
        }`}
        style={{ paddingTop: "0.6rem", paddingBottom: "0.6rem" }}
      >
        <span className={selected ? "text-[#e2e2e2]" : "text-[#ebbbb4]/30"}>
          {selected ? selected.name : "Select product…"}
        </span>
        <span
          className={`material-symbols-outlined flex-shrink-0 text-[18px] mt-0.5 transition-transform duration-200 ${
            open ? "rotate-180 text-primary" : "text-[#ebbbb4]/40"
          }`}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-px bg-[#161616] border border-[#603e39] max-h-[240px] overflow-y-auto shadow-xl shadow-black/60">
          {availableProducts.length === 0 ? (
            <div className="px-4 py-6 text-center font-mono text-[11px] text-[#ebbbb4]/30">
              No more products available.
            </div>
          ) : (
            availableProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); toggle(false); }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors border-b border-[#603e39]/20 ${
                  p.id === value
                    ? "bg-primary/10 text-primary"
                    : "text-[#e2e2e2] hover:bg-[#2a2a2a]"
                }`}
              >
                <span className="font-mono text-[12px] leading-tight">{p.name}</span>
                <span className="flex-shrink-0 font-mono text-[12px] text-[#ebbbb4]/60">
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

// ─── Product Row Component ────────────────────────────────────────────────────

function ProductRowInput({
  row, index, onProductChange, onQtyChange, onRemove, canRemove, products, excludeIds,
}: {
  row: ProductRow;
  index: number;
  onProductChange: (id: string, productId: string) => void;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  products: Product[];
  excludeIds: string[];
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectedProduct = products.find((p) => p.id === row.productId);
  const maxQty = selectedProduct?.stock ?? undefined;

  function handleQtyChange(raw: string) {
    const v = raw.replace(/[^0-9]/g, "");
    const parsed = v === "" ? 0 : parseInt(v);
    const capped = maxQty != null ? Math.min(parsed, maxQty) : parsed;
    onQtyChange(row.id, capped);
  }

  function handleQtyBlur() {
    const min = Math.max(1, row.qty);
    const capped = maxQty != null ? Math.min(min, maxQty) : min;
    onQtyChange(row.id, capped);
  }

  const qtyInput = (
    <div className="w-24">
      <label className={labelClass}>
        Qty{maxQty != null && <span className="text-[#ebbbb4]/40 normal-case tracking-normal ml-1">(max {maxQty})</span>}
      </label>
      <input
        type="text" inputMode="numeric" value={row.qty}
        onChange={(e) => handleQtyChange(e.target.value)}
        onBlur={handleQtyBlur}
        className={inputClass()}
      />
    </div>
  );

  return (
    <div className="glass-panel p-4 glitch-hover transition-all" style={{ position: "relative", zIndex: dropdownOpen ? 10 : undefined }}>
      {/* Mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div>
          <label className={labelClass}>
            <span className="text-primary/60 mr-2">{String(index + 1).padStart(2, "0")}</span>
            Product
          </label>
          <ProductDropdown value={row.productId} onChange={(id) => onProductChange(row.id, id)} onOpenChange={setDropdownOpen} products={products} excludeIds={excludeIds} />
        </div>
        <div className="flex items-end gap-3">
          {qtyInput}
          {canRemove && (
            <button type="button" onClick={() => onRemove(row.id)}
              className="flex-shrink-0 w-10 h-[46px] flex items-center justify-center border border-[#603e39]/60 text-[#ebbbb4]/40 hover:border-primary hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex items-end gap-3">
        <div className="flex-shrink-0 font-mono text-[10px] text-primary/60 w-5 pt-6">{String(index + 1).padStart(2, "0")}</div>
        <div className="flex-1">
          <label className={labelClass}>Product</label>
          <ProductDropdown value={row.productId} onChange={(id) => onProductChange(row.id, id)} onOpenChange={setDropdownOpen} products={products} excludeIds={excludeIds} />
        </div>
        {qtyInput}
        {canRemove && (
          <button type="button" onClick={() => onRemove(row.id)}
            className="mb-0.5 flex-shrink-0 w-10 h-[46px] flex items-center justify-center border border-[#603e39]/60 text-[#ebbbb4]/40 hover:border-primary hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Order Summary ────────────────────────────────────────────────────────────

function OrderSummary({ rows, onProductClick, products }: {
  rows: ProductRow[];
  onProductClick: (product: Product, qty: number) => void;
  products: Product[];
}) {
  const filledRows = rows.filter((r) => r.productId);
  if (filledRows.length === 0) return null;

  const estimatedTotal = filledRows.reduce((sum, row) => {
    const p = products.find((p) => p.id === row.productId);
    return sum + (p ? (p.sale_price ?? p.price) * row.qty : 0);
  }, 0);

  return (
    <div className="space-y-3">
      {filledRows.map((row) => {
        const p = products.find((x) => x.id === row.productId)!;
        const unitPrice = p.sale_price ?? p.price;
        return (
          <div key={row.id} className="glass-panel overflow-hidden">
            <div onClick={() => onProductClick(p, row.qty)}
              className="flex items-center gap-4 p-4 cursor-pointer hover:border-primary transition-colors">
              <div className="flex-shrink-0 w-[60px] h-[60px] relative border border-[#603e39]/30 overflow-hidden">
                <Image src={p.image} alt={p.name} fill sizes="60px" className="object-cover" unoptimized />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-inter font-bold text-[14px] text-[#e2e2e2] leading-tight">
                  {p.name}<span className="text-[#ebbbb4]/60 font-normal"> × {row.qty}</span>
                </p>
                <p className="font-mono text-[11px] text-[#ebbbb4]/50 mt-0.5">₱{unitPrice.toLocaleString()} each</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-mono text-[13px] text-primary font-bold">₱{(unitPrice * row.qty).toLocaleString()}</p>
                <p className="font-mono text-[10px] text-[#ebbbb4]/40">subtotal</p>
              </div>
            </div>
            {p.pre_order_note && (
              <div className="border-t border-[#603e39]/30 bg-orange-400/5 px-4 py-3">
                <p className="font-mono text-[10px] tracking-widest uppercase text-orange-400/70 mb-1.5">Pre-Order Note</p>
                <div
                  className="font-mono text-[12px] text-[#ebbbb4]/70 leading-relaxed prose-invert [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-primary [&_strong]:text-[#e2e2e2] [&_p]:mb-1"
                  dangerouslySetInnerHTML={{ __html: p.pre_order_note }}
                />
              </div>
            )}
          </div>
        );
      })}

      <div className="border border-[#603e39]/40 p-4 space-y-3 mt-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] tracking-widest text-[#ebbbb4]/60 uppercase">Shipping Fee</span>
          <span className="font-mono text-[13px] text-[#ebbbb4]/60 italic">TBA</span>
        </div>
        <div className="h-px bg-[#603e39]/30" />
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[12px] tracking-widest text-[#e2e2e2] uppercase">Estimated Total</span>
            <p className="font-mono text-[10px] text-[#ebbbb4]/40 mt-0.5">Shipping fee not yet included</p>
          </div>
          <span className="font-inter font-black text-[22px] text-primary">₱{estimatedTotal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────

function ProductDetailModal({ product, qty, onClose }: { product: Product; qty: number; onClose: () => void }) {
  const unitPrice = product.sale_price ?? product.price;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8 bg-background/90 backdrop-blur-xl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-panel w-full max-w-2xl overflow-hidden animate-fade-up flex flex-col">
        <div className="sm:hidden sticky top-0 bg-surface-container-lowest/95 backdrop-blur-sm border-b border-outline-variant/30 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="font-inter font-bold text-[16px] text-[#e2e2e2]">Product Details</h3>
          <button onClick={onClose} className="text-[#ebbbb4]/40 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Mobile */}
          <div className="sm:hidden p-6 space-y-6">
            <div className="w-full aspect-square relative border border-[#603e39]/30 overflow-hidden">
              <Image src={product.image} alt={product.name} fill sizes="calc(100vw - 48px)" className="object-cover" unoptimized />
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[10px] text-[#ebbbb4]/50 uppercase tracking-widest mb-1">Product Name</p>
                <p className="font-inter font-bold text-[18px] text-[#e2e2e2]">{product.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[10px] text-[#ebbbb4]/50 uppercase tracking-widest mb-1">Quantity</p>
                  <p className="font-inter text-[20px] font-bold text-primary">{qty}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-[#ebbbb4]/50 uppercase tracking-widest mb-1">Unit Price</p>
                  <p className="font-inter text-[16px] font-bold text-[#e2e2e2]">₱{unitPrice.toLocaleString()}</p>
                </div>
              </div>
              <div className="border-t border-[#603e39]/30 pt-4">
                <p className="font-mono text-[10px] text-[#ebbbb4]/50 uppercase tracking-widest mb-2">Subtotal</p>
                <p className="font-inter text-[24px] font-black text-primary">₱{(unitPrice * qty).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden sm:grid grid-cols-2 gap-8 p-8 h-full">
            <div className="flex items-center justify-center">
              <div className="w-full aspect-square relative border border-[#603e39]/30 overflow-hidden">
                <Image src={product.image} alt={product.name} fill sizes="400px" className="object-cover" unoptimized />
              </div>
            </div>
            <div className="flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <p className="font-mono text-[10px] text-[#ebbbb4]/50 uppercase tracking-widest mb-2">Product Name</p>
                  <p className="font-inter font-bold text-[22px] text-[#e2e2e2]">{product.name}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="font-mono text-[10px] text-[#ebbbb4]/50 uppercase tracking-widest mb-1">Quantity</p>
                    <p className="font-inter text-[24px] font-bold text-primary">{qty}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-[#ebbbb4]/50 uppercase tracking-widest mb-1">Unit Price</p>
                    <p className="font-inter text-[18px] font-bold text-[#e2e2e2]">₱{unitPrice.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-[#603e39]/30 pt-6">
                <p className="font-mono text-[10px] text-[#ebbbb4]/50 uppercase tracking-widest mb-2">Subtotal</p>
                <p className="font-inter text-[28px] font-black text-primary">₱{(unitPrice * qty).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#603e39]/30 bg-surface-container-lowest/95 backdrop-blur-sm px-6 py-4">
          <button onClick={onClose} className="w-full px-6 py-3 bg-primary text-white font-mono text-[12px] tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PreOrderPage() {
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);

  const [contact, setContact] = useState<ContactForm>({ name: "", location: "", phone: "", email: "" });
  const [rows, setRows] = useState<ProductRow[]>([{ id: uid(), productId: "", qty: 1 }]);
  const [selectedProductDetail, setSelectedProductDetail] = useState<{ product: Product; qty: number } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedProducts, setSubmittedProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch products
    fetch("/api/products?preOrder=true")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          // Auto-select product from ?product=ID query param
          const params = new URLSearchParams(window.location.search);
          const productParam = params.get("product");
          if (productParam) {
            const match = data.find((p: Product) => (p.slug ?? p.id) === productParam);
            if (match) setRows([{ id: uid(), productId: match.id, qty: 1 }]);
          }
        }
      })
      .catch(() => {});

    // Check auth and auto-fill
    supabaseClient.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { user, access_token } = data.session;
      setUserEmail(user.email ?? null);

      const res = await fetch("/api/account/profile", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!res.ok) {
        // profile not yet created — at least fill email
        setContact(prev => ({ ...prev, email: user.email ?? "" }));
        return;
      }
      const profile = await res.json();
      const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
      const location = [profile.billing_city, profile.billing_state].filter(Boolean).join(", ");
      setContact({
        name: name || "",
        email: user.email ?? "",
        phone: profile.billing_phone || "",
        location: location || "",
      });
      setAutoFilled(true);
    });
  }, []);

  // Only show products with pre_order flag active
  const preOrderProducts = products.filter((p) => p.pre_order === true);

  const setContact$ = (field: keyof ContactForm, value: string) =>
    setContact((prev) => ({ ...prev, [field]: value }));

  const blurPhone = () => setFieldErrors((p) => ({ ...p, phone: validatePhone(contact.phone) }));
  const blurEmail = () => setFieldErrors((p) => ({ ...p, email: validateEmail(contact.email) }));

  const addRow = () => setRows((prev) => [...prev, { id: uid(), productId: "", qty: 1 }]);
  const updateProductId = (id: string, productId: string) => setRows((prev) => prev.map((r) => r.id === id ? { ...r, productId } : r));
  const updateQty = (id: string, qty: number) => setRows((prev) => prev.map((r) => r.id === id ? { ...r, qty } : r));
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneErr = validatePhone(contact.phone);
    const emailErr = validateEmail(contact.email);
    if (phoneErr || emailErr) { setFieldErrors({ phone: phoneErr, email: emailErr }); return; }

    const filledRows = rows.filter((r) => r.productId);
    if (filledRows.length === 0) { setError("Please select at least one product."); return; }

    setError("");
    setSubmitting(true);
    try {
      const orderItems = filledRows.map((r) => {
        const p = preOrderProducts.find((p) => p.id === r.productId)!;
        const price = p.sale_price ?? p.price;
        return { product_id: p.id, product: p.name, qty: r.qty, unit_price: price, subtotal: price * r.qty };
      });
      const estimatedTotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
      const res = await fetch("/api/pre-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contact, items: orderItems, estimatedTotal }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit order.");
      }
      setSubmittedProducts(filledRows.map((r) => preOrderProducts.find((p) => p.id === r.productId)!));
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#131313] cyber-grid flex flex-col items-center justify-center px-4">
          <div className="glass-panel max-w-md w-full p-10 flex flex-col items-center text-center gap-6 animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[32px]">check_circle</span>
            </div>
            <div className="w-full">
              <p className="font-mono text-[11px] tracking-widest text-primary mb-2">ORDER_RECEIVED</p>
              <h2 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">Pre-Order Sent!</h2>
              <p className="font-mono text-[13px] text-[#ebbbb4]/60 mt-3 leading-relaxed">
                We received your pre-order, {contact.name}. We&apos;ll reach out to you via{" "}
                <span className="text-primary">{contact.email || contact.phone}</span> to confirm the details.
              </p>
            </div>

            {/* Per-product pre-order notes */}
            {submittedProducts.some((p) => p.pre_order_note) && (
              <div className="w-full space-y-3">
                {submittedProducts.filter((p) => p.pre_order_note).map((p) => (
                  <div key={p.id} className="border border-orange-400/30 bg-orange-400/5 px-4 py-3 text-left">
                    <p className="font-mono text-[10px] tracking-widest uppercase text-orange-400/70 mb-1">{p.name}</p>
                    <div
                      className="font-mono text-[12px] text-[#ebbbb4]/70 leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-primary [&_strong]:text-[#e2e2e2] [&_p]:mb-1"
                      dangerouslySetInnerHTML={{ __html: p.pre_order_note! }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link href="/" className="flex-1 px-6 py-3 bg-primary text-white font-mono text-[12px] tracking-widest uppercase hover:brightness-110 transition-all text-center">
                Back to Home
              </Link>
              {userEmail && (
                <Link href="/account" className="flex-1 px-6 py-3 border border-[#603e39] text-[#ebbbb4]/60 font-mono text-[12px] tracking-widest uppercase hover:border-primary hover:text-primary transition-all text-center">
                  View Orders
                </Link>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#131313] cyber-grid pb-24">
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-14">
        {/* Page title */}
        <div className="mb-12 animate-fade-up">
          <p className="font-mono text-[11px] tracking-[0.2em] text-primary mb-2">XZVL_STORE // PRE_ORDER</p>
          <h1 className="font-inter font-black text-[40px] md:text-[56px] uppercase leading-none text-[#e2e2e2]">
            Pre-Order<br /><span className="text-primary italic">Form</span>
          </h1>
        </div>

        {/* Auth banner */}
        {!userEmail ? (
          <div className="mb-10 border border-[#603e39]/40 bg-[#1a1a1a] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[22px] flex-shrink-0 mt-0.5">account_circle</span>
              <div>
                <p className="font-mono text-[12px] text-[#e2e2e2] tracking-wide mb-1">Have an account?</p>
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-[10px] text-[#ebbbb4]/50 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[11px] text-primary/60">receipt_long</span>
                    Track your orders in one place
                  </p>
                  <p className="font-mono text-[10px] text-[#ebbbb4]/50 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[11px] text-primary/60">edit_note</span>
                    Auto-fill this form from your saved info
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link href={`/auth/login?redirect=/pre-order`} className="px-4 py-2 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/10 transition-colors">
                Sign In
              </Link>
              <Link href={`/auth/signup?redirect=/pre-order`} className="font-mono text-[11px] text-[#ebbbb4]/50 hover:text-primary transition-colors">
                Create Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="mb-10 border border-[#603e39]/40 bg-[#1a1a1a] px-5 py-4 flex items-center justify-between gap-4 animate-fade-up">
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-[18px] ${autoFilled ? "text-green-400" : "text-primary"}`}>
                {autoFilled ? "check_circle" : "account_circle"}
              </span>
              <div>
                <p className="font-mono text-[11px] text-[#e2e2e2]">
                  {autoFilled ? "Form auto-filled from your account" : "Signed in"}
                </p>
                <p className="font-mono text-[10px] text-[#ebbbb4]/40 mt-0.5">{userEmail}</p>
              </div>
            </div>
            <Link href="/account" className="font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              My Account
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-12">
          {/* ── Contact Info ── */}
          <section className="animate-fade-up" style={{ animationDelay: "80ms" }}>
            {sectionTitle("SECTION_01", "Contact Information")}
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Name <span className="text-primary">*</span></label>
                  <input type="text" required placeholder="Juan dela Cruz" value={contact.name}
                    onChange={(e) => setContact$("name", e.target.value)} className={inputClass()} />
                </div>
                <div>
                  <label className={labelClass}>Location <span className="text-primary">*</span></label>
                  <input type="text" required placeholder="City, Province" value={contact.location}
                    onChange={(e) => setContact$("location", e.target.value)} className={inputClass()} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Phone <span className="text-primary">*</span></label>
                  <input type="tel" required placeholder="09XX XXX XXXX" value={contact.phone}
                    onChange={(e) => { setContact$("phone", e.target.value); if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: "" })); }}
                    onBlur={blurPhone} className={inputClass(!!fieldErrors.phone)} />
                  {fieldErrors.phone && (
                    <p className="mt-1.5 font-mono text-[11px] text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">error</span>{fieldErrors.phone}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Email <span className="text-primary">*</span></label>
                  <input type="email" required placeholder="you@example.com" value={contact.email}
                    onChange={(e) => { setContact$("email", e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" })); }}
                    onBlur={blurEmail} className={inputClass(!!fieldErrors.email)} />
                  {fieldErrors.email && (
                    <p className="mt-1.5 font-mono text-[11px] text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">error</span>{fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Products ── */}
          <section className="animate-fade-up z-10 relative" style={{ animationDelay: "160ms" }}>
            {sectionTitle("SECTION_02", "Product Selection")}
            {preOrderProducts.length === 0 ? (
              <div className="glass-panel p-8 text-center">
                <span className="material-symbols-outlined text-[32px] text-[#ebbbb4]/20 mb-3 block">inventory_2</span>
                <p className="font-mono text-[12px] text-[#ebbbb4]/40">No products are available for pre-order at the moment.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {rows.map((row, i) => (
                    <ProductRowInput key={row.id} row={row} index={i}
                      onProductChange={updateProductId} onQtyChange={updateQty} onRemove={removeRow}
                      canRemove={rows.length > 1} products={preOrderProducts}
                      excludeIds={rows.filter((r) => r.id !== row.id && r.productId !== "").map((r) => r.productId)} />
                  ))}
                </div>
                <button type="button" onClick={addRow}
                  className="mt-4 flex items-center gap-2 px-5 py-3 border border-[#603e39]/60 text-[#ebbbb4]/60 hover:border-primary hover:text-primary font-mono text-[12px] tracking-widest uppercase transition-colors">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add More
                </button>
              </>
            )}
          </section>

          {/* ── Order Summary ── */}
          {rows.some((r) => r.productId) && (
            <section className="animate-fade-up z-9 relative" style={{ animationDelay: "240ms" }}>
              {sectionTitle("SECTION_03", "Order Summary")}
              <OrderSummary rows={rows} onProductClick={(p, qty) => setSelectedProductDetail({ product: p, qty })} products={preOrderProducts} />
            </section>
          )}

          {error && (
            <p className="flex items-center gap-2 font-mono text-[13px] text-error">
              <span className="material-symbols-outlined text-[16px]">error</span>{error}
            </p>
          )}

          {/* Cancellation policy notice */}
          <div className="border border-[#603e39]/40 bg-[#1a1a1a] px-4 py-4 flex gap-3">
            <span className="material-symbols-outlined text-[18px] text-primary/70 flex-shrink-0 mt-0.5">info</span>
            <div className="space-y-1">
              <p className="font-mono text-[11px] tracking-widest uppercase text-[#ebbbb4]/60">Pre-Order Policy</p>
              <p className="font-mono text-[12px] text-[#ebbbb4]/50 leading-relaxed">
                Pre-orders <span className="text-[#e2e2e2]/80">cannot be cancelled</span> once placed. Your reservation will only be voided if the total number of pre-orders does not meet the required allocation.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={submitting || preOrderProducts.length === 0}
              className="w-full sm:w-auto px-12 py-4 bg-primary text-white font-mono text-[12px] tracking-[0.15em] uppercase hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px]">{submitting ? "hourglass_empty" : "send"}</span>
              {submitting ? "Submitting…" : "Submit Pre-Order"}
            </button>
            <p className="mt-3 font-mono text-[11px] text-[#ebbbb4]/40">
              We&apos;ll contact you to confirm your order and provide payment details.
            </p>
          </div>
        </form>
      </div>

      {selectedProductDetail && (
        <ProductDetailModal product={selectedProductDetail.product} qty={selectedProductDetail.qty}
          onClose={() => setSelectedProductDetail(null)} />
      )}
      </main>
      <Footer />
    </>
  );
}
