"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { DbProduct } from "@/lib/supabase";
import { BUNDLE_BLOCKED_REASON, blocksBundle, type BundleItemRef, type ResolvedBundle } from "@/lib/bundle-types";
import { sizedImageUrl } from "@/lib/image-sizes";
import { ImageUploader, TogglePill } from "../products/_form";

const INPUT = "w-full bg-fg/[0.05] border border-line text-fg tabular-nums text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-accent/40 focus:ring-2 focus:ring-primary/20";
const LABEL = "block tabular-nums text-[10px] uppercase text-accent/60 mb-1.5 tracking-wider font-medium";

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
const unitPriceOf = (p: DbProduct) => p.sale_price ?? p.price;
const thumbOf = (p: DbProduct) => p.main_image ?? (p.image || null);
const isPickable = (p: DbProduct) => p.status === "active";

function ProductFlags({ p }: { p: DbProduct }) {
  if (!blocksBundle(p)) return null;
  return (
    <p className="tabular-nums text-[10px] text-orange-400 flex items-center gap-1">
      <span className="uppercase tracking-wider font-medium border border-orange-400/40 bg-orange-400/10 px-1 rounded">
        {p.pre_order ? "pre-order" : "sneak peek"}
      </span>
      Disables the bundle
    </p>
  );
}

function Thumb({ src, alt, size }: { src: string | null; alt: string; size: number }) {
  return (
    <div className="relative flex-shrink-0 bg-deep border border-line/20 overflow-hidden rounded-md" style={{ width: size, height: size }}>
      {src ? (
        <Image
          src={sizedImageUrl(src, "small") ?? src}
          alt={alt}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={(e) => { if (e.currentTarget.src !== src) e.currentTarget.src = src; }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="material-symbols-outlined text-[14px] text-accent/40">image</span>
        </div>
      )}
    </div>
  );
}

export default function BundleForm({ bundleId }: { bundleId?: string }) {
  const router = useRouter();
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [active, setActive] = useState(true);
  const [maxPurchaseEnabled, setMaxPurchaseEnabled] = useState(false);
  const [maxPurchaseLimit, setMaxPurchaseLimit] = useState("");
  const [items, setItems] = useState<BundleItemRef[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!!bundleId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => {});

    if (bundleId) {
      fetch(`/api/admin/bundles/${bundleId}`)
        .then((r) => r.json())
        .then((b: ResolvedBundle) => {
          setName(b.name);
          setPrice(String(b.price));
          setImage(b.image ?? "");
          setActive(b.status === "active");
          setMaxPurchaseEnabled(b.max_purchase_enabled ?? false);
          setMaxPurchaseLimit(b.max_purchase_limit ? String(b.max_purchase_limit) : "");
          setItems(b.items ?? []);
          setLoading(false);
        });
    }
  }, [bundleId]);

  const productById = new Map(products.map((p) => [p.id, p]));

  const lines = items.map((it) => {
    const p = productById.get(it.product_id);
    return { ...it, product: p, unit: p ? unitPriceOf(p) : 0 };
  });
  const blocked = lines.some((l) => l.product && blocksBundle(l.product));
  const regularTotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const bundlePrice = price.trim() === "" ? 0 : Number(price);
  const discount = regularTotal - bundlePrice;
  const bundleStock = lines.length
    ? Math.max(0, Math.min(...lines.map((l) => Math.floor((l.product?.stock ?? 0) / l.qty))))
    : 0;

  const query = search.trim().toLowerCase();
  const results = query
    ? products
        .filter(isPickable)
        .filter((p) => !items.some((it) => it.product_id === p.id))
        .filter((p) => p.name.toLowerCase().includes(query) || (p.sku ?? "").toLowerCase().includes(query))
        .slice(0, 8)
    : [];

  const addProduct = (id: string) => {
    setItems((prev) => [...prev, { product_id: id, qty: 1 }]);
    setSearch("");
  };
  const setQty = (id: string, qty: number) =>
    setItems((prev) => prev.map((it) => (it.product_id === id ? { ...it, qty: Math.max(1, qty) } : it)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.product_id !== id));

  const save = async () => {
    if (!name.trim()) { setError("Bundle name is required."); return; }
    if (items.length === 0) { setError("Add at least one product to the bundle."); return; }
    if (price.trim() === "" || !Number.isFinite(bundlePrice) || bundlePrice < 0) {
      setError("Enter a valid bundle price.");
      return;
    }
    const limit = Math.floor(Number(maxPurchaseLimit));
    if (maxPurchaseEnabled && !(limit >= 1)) {
      setError("Enter a maximum purchase limit of at least 1.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(bundleId ? `/api/admin/bundles/${bundleId}` : "/api/admin/bundles", {
        method: bundleId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          price: bundlePrice,
          image: image || null,
          status: active && !blocked ? "active" : "inactive",
          max_purchase_enabled: maxPurchaseEnabled,
          max_purchase_limit: maxPurchaseEnabled ? limit : null,
          items,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save.");
      }
      router.push("/admin/bundle-products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 tabular-nums text-[12px] text-accent/60 py-12">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/bundle-products" className="inline-flex items-center gap-1 tabular-nums text-[10px] text-accent/60 hover:text-primary transition-colors mb-3">
            <span className="material-symbols-outlined text-[13px]">arrow_back</span>
            Back to Bundles
          </Link>
          <h1 className="font-semibold text-fg text-[22px] tracking-tight">
            {bundleId ? "Edit Bundle" : "Add Bundle"}
          </h1>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-1.5 bg-primary border border-primary text-white tabular-nums text-[11px] hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0 mt-8 font-medium shadow-sm"
        >
          {saving
            ? <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
            : <span className="material-symbols-outlined text-[14px]">save</span>
          }
          {saving ? "Saving…" : "Save Bundle"}
        </button>
      </div>

      {/* ── Details ── */}
      <div className="bg-panel border border-line/30 p-5 rounded-lg grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5">
        <ImageUploader value={image} onChange={setImage} label="Main Image" aspectClass="aspect-square" />
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Bundle Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Starter Battle Set" className={INPUT} autoFocus={!bundleId} />
          </div>
          <div>
            <label className={LABEL}>Bundle Price (₱) <span className="text-red-400">*</span></label>
            <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className={INPUT} />
          </div>
          <TogglePill
            active={active && !blocked}
            onClick={() => setActive((v) => !v)}
            disabled={blocked}
            title="Enabled"
            subtitle={blocked ? BUNDLE_BLOCKED_REASON : "Show this bundle on the store"}
            activeClass="border-green-400/50 bg-green-400/10"
            switchClass="bg-green-400"
          />
          <TogglePill
            active={maxPurchaseEnabled}
            onClick={() => setMaxPurchaseEnabled((v) => !v)}
            title="Maximum Purchase Limit"
            subtitle="Cap how many of this bundle a single customer can buy"
            activeClass="border-blue-400/50 bg-blue-400/10"
          />
          {maxPurchaseEnabled && (
            <div>
              <label className={LABEL}>Maximum Purchase Limit (per customer)</label>
              <input
                type="number"
                min="1"
                value={maxPurchaseLimit}
                onChange={(e) => setMaxPurchaseLimit(e.target.value)}
                placeholder="e.g. 2"
                className={INPUT}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Products ── */}
      <div className="bg-panel border border-line/30 p-5 rounded-lg space-y-4">
        <p className="tabular-nums text-[13px] font-semibold text-fg">Products in this bundle</p>

        {/* Search to add */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-fg/[0.05] border border-line focus-within:border-primary px-4 py-2.5 transition-colors">
            <span className="material-symbols-outlined text-accent/50 text-[16px]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a product by name or SKU to add…"
              className="flex-1 bg-transparent text-fg tabular-nums text-[13px] focus:outline-none placeholder:text-accent/40"
            />
          </div>
          {query && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-canvas border border-line/50 shadow-xl rounded-md max-h-72 overflow-y-auto">
              {results.length === 0 ? (
                <p className="px-4 py-3 tabular-nums text-[11px] text-accent/50">
                  No matching products. Inactive products can&apos;t be bundled.
                </p>
              ) : (
                results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-panel transition-colors"
                  >
                    <Thumb src={thumbOf(p)} alt={p.name} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-fg truncate">{p.name}</p>
                      <p className="tabular-nums text-[10px] text-accent/60">{p.sku ?? "No SKU"} · Stock {p.stock}</p>
                      <ProductFlags p={p} />
                    </div>
                    <span className="tabular-nums text-[12px] text-fg">{peso(unitPriceOf(p))}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Items */}
        {lines.length === 0 ? (
          <p className="tabular-nums text-[11px] text-accent/50 py-4 text-center">No products added yet.</p>
        ) : (
          <div className="border border-line/30 rounded-md divide-y divide-line/20">
            {lines.map((l) => {
              const p = l.product;
              return (
                <div key={l.product_id} className="flex items-center gap-3 px-3 py-2.5">
                  <Thumb src={p ? thumbOf(p) : null} alt={p?.name ?? ""} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-fg truncate">{p?.name ?? "Deleted product"}</p>
                    <p className="tabular-nums text-[10px] text-accent/60">
                      {p?.sku ?? "No SKU"} · {peso(l.unit)} each · Stock{" "}
                      <span className={(p?.stock ?? 0) < l.qty ? "text-red-400 font-bold" : ""}>{p?.stock ?? 0}</span>
                    </p>
                    {p && <ProductFlags p={p} />}
                    {(!p || p.status !== "active") && (
                      <p className="tabular-nums text-[10px] text-red-400">
                        {p ? "Inactive — this bundle won't show on the store." : "This product no longer exists — remove it."}
                      </p>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) => setQty(l.product_id, Math.floor(Number(e.target.value) || 1))}
                    className="w-16 bg-fg/[0.05] border border-line text-fg tabular-nums text-[12px] px-2 py-1.5 text-center focus:outline-none focus:border-primary"
                    title="Quantity in bundle"
                  />
                  <span className="w-20 text-right tabular-nums text-[12px] text-fg">{peso(l.unit * l.qty)}</span>
                  <button onClick={() => removeItem(l.product_id)} className="text-accent/50 hover:text-red-400 transition-colors" title="Remove">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Regular Total", value: peso(regularTotal), cls: "text-fg" },
            { label: "Bundle Price", value: peso(bundlePrice || 0), cls: "text-primary" },
            {
              label: "Price Off",
              value: discount >= 0
                ? `${peso(discount)}${regularTotal > 0 ? ` (${Math.round((discount / regularTotal) * 100)}%)` : ""}`
                : `+${peso(-discount)}`,
              cls: discount >= 0 ? "text-green-400" : "text-red-400",
            },
            { label: "Bundle Stock", value: String(bundleStock), cls: bundleStock === 0 ? "text-red-400" : bundleStock <= 5 ? "text-yellow-400" : "text-green-400" },
          ].map((s) => (
            <div key={s.label} className="bg-deep border border-line/20 rounded-md px-3 py-2">
              <p className="tabular-nums text-[9px] uppercase text-accent/60 tracking-wider font-medium">{s.label}</p>
              <p className={`tabular-nums text-[14px] font-bold ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>
        {discount < 0 && (
          <p className="tabular-nums text-[11px] text-red-400">The bundle price is higher than buying the products separately.</p>
        )}
        <p className="tabular-nums text-[10px] text-accent/50">
          Bundle stock follows the lowest stock among the products above. When ordered, each product is saved on the order at its normal price and the price off is applied as a discount.
        </p>
      </div>

      {error && (
        <p className="tabular-nums text-[12px] text-red-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      )}
    </div>
  );
}
