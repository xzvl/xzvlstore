"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import type { DbProduct, Taxonomy } from "@/lib/supabase";
import { sizedImageUrl } from "@/lib/image-sizes";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";
import { POUCH_LABEL, POUCH_SIZES, type PouchSize } from "@/lib/shipping";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

const INPUT = "w-full bg-fg/[0.05] border border-line text-fg tabular-nums text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-accent/40 focus:ring-2 focus:ring-primary/20";
const LABEL = "block tabular-nums text-[10px] uppercase text-accent/60 mb-1.5 tracking-wider font-medium";
const SELECT = "w-full bg-fg/[0.05] border border-line text-fg tabular-nums text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors focus:ring-2 focus:ring-primary/20";

// ─── Image uploader ───────────────────────────────────────────────────────────

export function ImageUploader({
  value,
  onChange,
  label,
  aspectClass = "aspect-square",
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  aspectClass?: string;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div>
      <p className="tabular-nums text-[10px] uppercase text-accent/60 mb-1.5 tracking-wider font-medium">
        {label}
      </p>
      <div
        className={`relative w-full rounded-md ${aspectClass} bg-deep border border-dashed border-line/50 overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary transition-colors group`}
        onClick={() => setShowPicker(true)}
      >
        {value ? (
          <>
            <Image
              src={sizedImageUrl(value, "medium") ?? value}
              alt={label}
              fill
              sizes="200px"
              className="object-cover"
              onError={(e) => {
                if (e.currentTarget.src !== value) e.currentTarget.src = value;
              }}
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-white text-[20px]">upload</span>
              <span className="tabular-nums text-white text-[11px] font-medium">
                Replace
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-accent/50">
            <span className="material-symbols-outlined text-[24px]">upload</span>
            <span className="tabular-nums text-[10px] uppercase tracking-wider font-medium">Upload</span>
          </div>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          className="mt-1 tabular-nums text-[10px] text-accent/60 hover:text-primary transition-colors"
        >
          Remove
        </button>
      )}

      {showPicker && (
        <MediaLibraryModal
          onClose={() => setShowPicker(false)}
          onSelect={(urls) => {
            onChange(urls[0]);
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Gallery uploader ─────────────────────────────────────────────────────────

function GalleryUploader({
  values,
  onChange,
}: {
  values: string[];
  onChange: (urls: string[]) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...values];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div>
      <p className="tabular-nums text-[10px] uppercase text-accent/60 mb-1.5 tracking-wider font-medium">
        Gallery Images
      </p>
      <div className="flex flex-wrap gap-2">
        {values.map((url, i) => (
          <div
            key={url + i}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => { e.preventDefault(); if (dragIndex !== null) setOverIndex(i); }}
            onDragLeave={() => setOverIndex((cur) => (cur === i ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) reorder(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
            title="Drag to reorder"
            className={`relative w-16 h-16 bg-deep border overflow-hidden group cursor-move transition-colors rounded-md ${
              overIndex === i && dragIndex !== null && dragIndex !== i ? "border-primary" : "border-line/40"
            } ${dragIndex === i ? "opacity-40" : ""}`}
          >
            <Image
              src={sizedImageUrl(url, "thumbnail") ?? url}
              alt=""
              fill
              sizes="64px"
              className="object-cover pointer-events-none"
              draggable={false}
              onError={(e) => {
                if (e.currentTarget.src !== url) e.currentTarget.src = url;
              }}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-primary text-[16px]">close</span>
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="w-16 h-16 flex flex-col items-center justify-center bg-deep border border-dashed border-line/50 hover:border-primary text-accent/50 hover:text-primary transition-colors rounded-md"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>
      </div>

      {showPicker && (
        <MediaLibraryModal
          multiple
          onClose={() => setShowPicker(false)}
          onSelect={(urls) => {
            onChange([...values, ...urls]);
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Toggle pill ──────────────────────────────────────────────────────────────

export function TogglePill({
  active,
  onClick,
  title,
  subtitle,
  activeClass,
  switchClass = "bg-orange-400",
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  activeClass: string;
  switchClass?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-4 py-3 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? activeClass : `border-line/50 bg-fg/[0.05] ${disabled ? "" : "hover:border-accent/30"}`
      }`}
    >
      <div>
        <p className="tabular-nums text-[11px] text-left text-fg font-medium">{title}</p>
        <p className="tabular-nums text-[10px] text-accent/60 text-left mt-0.5">{subtitle}</p>
      </div>
      <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${active ? switchClass : "bg-line/40"}`}>
        <span
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: `translateX(${active ? "0.125rem" : "-1.125rem"})` }}
        />
      </div>
    </button>
  );
}

// ─── Product form ─────────────────────────────────────────────────────────────

const toSlug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const defaultNewArrivalUntil = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  sku: string;
  price: string;
  sale_price: string;
  cost: string;
  stock: string;
  brand_id: string;
  category_ids: string[];
  tag_ids: string[];
  status: "active" | "inactive";
  pre_order: boolean;
  pre_order_note: string;
  down_payment_required: boolean;
  down_payment_price: string;
  sneak_peek: boolean;
  sneak_peek_note: string;
  bundle_only: boolean;
  taxable: boolean;
  include_in_totals: boolean;
  max_purchase_enabled: boolean;
  max_purchase_limit: string;
  new_arrival: boolean;
  new_arrival_until: string;
  main_image: string;
  gallery_images: string[];
  social_image: string;
  pouch_size: PouchSize | "";
  pouch_upgrade_medium_qty: string;
  pouch_upgrade_large_qty: string;
  weight: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  sku: "",
  price: "",
  sale_price: "",
  cost: "",
  stock: "0",
  brand_id: "",
  category_ids: [],
  tag_ids: [],
  status: "active",
  pre_order: false,
  pre_order_note: "",
  down_payment_required: false,
  down_payment_price: "",
  sneak_peek: false,
  sneak_peek_note: "",
  bundle_only: false,
  taxable: false,
  include_in_totals: true,
  max_purchase_enabled: false,
  max_purchase_limit: "",
  new_arrival: false,
  new_arrival_until: "",
  main_image: "",
  gallery_images: [],
  social_image: "",
  pouch_size: "",
  pouch_upgrade_medium_qty: "",
  pouch_upgrade_large_qty: "",
  weight: "",
};

function productToForm(p: DbProduct): FormState {
  return {
    name: p.name,
    slug: p.slug ?? toSlug(p.name),
    description: p.description ?? "",
    sku: p.sku ?? "",
    price: String(p.price),
    sale_price: p.sale_price ? String(p.sale_price) : "",
    cost: String(p.cost),
    stock: String(p.stock),
    brand_id: p.brand_id ?? "",
    category_ids: p.category_ids ?? [],
    tag_ids: p.tag_ids ?? [],
    status: p.status,
    pre_order: p.pre_order ?? false,
    pre_order_note: p.pre_order_note ?? "",
    down_payment_required: p.down_payment_required ?? false,
    down_payment_price: p.down_payment_price != null ? String(p.down_payment_price) : "",
    sneak_peek: p.sneak_peek ?? false,
    sneak_peek_note: p.sneak_peek_note ?? "",
    bundle_only: p.bundle_only ?? false,
    taxable: p.taxable ?? false,
    include_in_totals: p.include_in_totals ?? true,
    max_purchase_enabled: p.max_purchase_enabled ?? false,
    max_purchase_limit: p.max_purchase_limit ? String(p.max_purchase_limit) : "",
    new_arrival: p.new_arrival ?? false,
    new_arrival_until: p.new_arrival_until ? p.new_arrival_until.slice(0, 10) : "",
    main_image: p.main_image ?? p.image ?? "",
    gallery_images: p.gallery_images ?? [],
    social_image: p.social_image ?? "",
    pouch_size: p.pouch_size ?? "",
    pouch_upgrade_medium_qty: p.pouch_upgrade_medium_qty != null ? String(p.pouch_upgrade_medium_qty) : "",
    pouch_upgrade_large_qty: p.pouch_upgrade_large_qty != null ? String(p.pouch_upgrade_large_qty) : "",
    weight: p.weight != null ? String(p.weight) : "",
  };
}

export default function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const [brands, setBrands] = useState<Taxonomy[]>([]);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [tags, setTags] = useState<Taxonomy[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/taxonomy")
      .then((r) => r.json())
      .then((data: Taxonomy[]) => {
        setBrands(data.filter((t) => t.type === "brand"));
        setCategories(data.filter((t) => t.type === "category"));
        setTags(data.filter((t) => t.type === "tag"));
      })
      .catch(() => {});

    if (productId) {
      fetch(`/api/admin/products/${productId}`)
        .then((r) => r.json())
        .then((p: DbProduct) => {
          setForm(productToForm(p));
          setLoading(false);
        });
    }
  }, [productId]);

  const set$ = (key: keyof FormState, value: string | string[] | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleInArray = (key: "category_ids" | "tag_ids", id: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((x) => x !== id)
        : [...prev[key], id],
    }));

  const formProfit =
    (form.sale_price ? Number(form.sale_price) : Number(form.price || 0)) -
    Number(form.cost || 0);

  const save = async () => {
    if (!form.name.trim()) { setError("Product name is required."); return; }
    const mediumAt = Number(form.pouch_upgrade_medium_qty) || 0;
    const largeAt = Number(form.pouch_upgrade_large_qty) || 0;
    if (form.pouch_size === "small" && mediumAt && largeAt && largeAt <= mediumAt) {
      setError("The quantity for a large pouch must be more than the quantity for a medium pouch.");
      return;
    }
    if (form.pre_order && form.down_payment_required && !(Number(form.down_payment_price) > 0)) {
      setError("Enter a down payment price greater than 0, or turn off Required Down Payment.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = productId ? `/api/admin/products/${productId}` : "/api/admin/products";
      const res = await fetch(url, {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price || 0),
          sale_price: form.sale_price ? Number(form.sale_price) : null,
          cost: Number(form.cost || 0),
          stock: Number(form.stock || 0),
          max_purchase_limit: form.max_purchase_enabled ? (Number(form.max_purchase_limit) || null) : null,
          down_payment_required: form.pre_order && form.down_payment_required,
          down_payment_price: form.pre_order && form.down_payment_required ? Number(form.down_payment_price) : null,
          new_arrival_until: form.new_arrival && form.new_arrival_until
            ? new Date(form.new_arrival_until).toISOString()
            : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save.");
      }
      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
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
          <Link href="/admin/products" className="inline-flex items-center gap-1 tabular-nums text-[10px] text-accent/60 hover:text-primary transition-colors mb-3">
            <span className="material-symbols-outlined text-[13px]">arrow_back</span>
            Back to Products
          </Link>
          <h1 className="font-semibold text-fg text-[22px] tracking-tight">
            {productId ? "Edit Product" : "Add Product"}
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
          {saving ? "Saving…" : "Save Product"}
        </button>
      </div>

      {/* ── Images ── */}
      <div className="bg-panel border border-line/30 p-5 rounded-lg">
        <p className="tabular-nums mb-3 text-[13px] font-semibold text-fg">Images</p>
        <div className="grid grid-cols-3 gap-4">
          <ImageUploader value={form.main_image} onChange={(url) => set$("main_image", url)} label="Main Image" aspectClass="aspect-square" />
          <ImageUploader value={form.social_image} onChange={(url) => set$("social_image", url)} label="Social Media" aspectClass="aspect-square" />
          <div className="col-span-3">
            <GalleryUploader values={form.gallery_images} onChange={(urls) => set$("gallery_images", urls)} />
          </div>
        </div>
      </div>

      {/* ── Details ── */}
      <div className="bg-panel border border-line/30 p-5 rounded-lg">
        <p className="tabular-nums mb-3 text-[13px] font-semibold text-fg">Details</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={LABEL}>Product Name <span className="text-red-400">*</span></label>
            <input
              value={form.name}
              onChange={(e) => {
                const newName = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name: newName,
                  slug: prev.slug === "" || prev.slug === toSlug(prev.name) ? toSlug(newName) : prev.slug,
                }));
              }}
              placeholder="e.g. CX-13 Bahamut Blitz"
              className={INPUT}
            />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Slug</label>
            <input value={form.slug} onChange={(e) => set$("slug", e.target.value)} placeholder="cx-13-bahamut-blitz" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>SKU</label>
            <input value={form.sku} onChange={(e) => set$("sku", e.target.value)} placeholder="e.g. CX13-BK1" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Brand</label>
            {brands.length === 0 ? (
              <p className="tabular-nums text-[11px] text-accent/50 italic">No brands yet — add in Taxonomy.</p>
            ) : (
              <select value={form.brand_id} onChange={(e) => set$("brand_id", e.target.value)} className={SELECT}>
                <option value="">— No brand —</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      <div className="bg-panel border border-line/30 p-5 rounded-lg">
        <p className="tabular-nums mb-3 text-[13px] font-semibold text-fg">Description</p>
        <RichTextEditor value={form.description} onChange={(html) => set$("description", html)} />
      </div>

      {/* ── Taxonomy ── */}
      <div className="bg-panel border border-line/30 p-5 rounded-lg">
        <p className="tabular-nums mb-3 text-[13px] font-semibold text-fg">Taxonomy</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Categories</label>
            {categories.length === 0 ? (
              <p className="tabular-nums text-[11px] text-accent/50 italic">No categories yet — add them in Taxonomy.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const selected = form.category_ids.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleInArray("category_ids", c.id)}
                      className={`px-3 py-1.5 tabular-nums text-[11px] tracking-wide border transition-colors text-left ${
                        selected ? "border-primary bg-primary/10 text-primary" : "border-line/50 text-accent/70 hover:border-accent/40 hover:text-fg"
                      }`}
                    >
                      {selected && <span className="material-symbols-outlined text-[11px] mr-1 align-middle">check</span>}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className={LABEL}>Tags</label>
            {tags.length === 0 ? (
              <p className="tabular-nums text-[11px] text-accent/50 italic">No tags yet — add them in Taxonomy.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const selected = form.tag_ids.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleInArray("tag_ids", t.id)}
                      className={`px-3 py-1.5 tabular-nums text-[11px] tracking-wide border transition-colors text-left ${
                        selected ? "border-orange-400/60 bg-orange-400/10 text-orange-400" : "border-line/50 text-accent/70 hover:border-accent/40 hover:text-fg"
                      }`}
                    >
                      {selected && <span className="material-symbols-outlined text-[11px] mr-1 align-middle">check</span>}
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Pricing ── */}
      <div className="bg-panel border border-line/30 p-5 rounded-lg">
        <p className="tabular-nums mb-3 text-[13px] font-semibold text-fg">Pricing</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "price", label: "Regular Price (₱)" },
            { key: "sale_price", label: "Sale Price (₱)", placeholder: "Leave blank if no sale" },
            { key: "cost", label: "Cost (₱)" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className={LABEL}>{label}</label>
              <input
                type="number"
                min="0"
                value={form[key as keyof FormState] as string}
                onChange={(e) => set$(key as keyof FormState, e.target.value)}
                placeholder={placeholder ?? "0"}
                className={INPUT}
              />
            </div>
          ))}
          <div>
            <label className={LABEL}>Profit</label>
            <div className={`px-4 py-2.5 border tabular-nums text-[13px] font-bold ${formProfit >= 0 ? "border-green-400/30 bg-green-400/5 text-green-400" : "border-primary/30 bg-primary/5 text-primary"}`}>
              ₱{formProfit.toLocaleString()}
              {form.sale_price && <span className="font-normal text-[10px] ml-2 opacity-60">(on sale price)</span>}
            </div>
          </div>
          <div className="md:col-span-2">
            <TogglePill
              active={form.new_arrival}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  new_arrival: !prev.new_arrival,
                  new_arrival_until: !prev.new_arrival && !prev.new_arrival_until
                    ? defaultNewArrivalUntil()
                    : prev.new_arrival_until,
                }))
              }
              title="New Arrival"
              subtitle="Feature this product as a new arrival until the schedule below"
              activeClass="border-green-400/50 bg-green-400/10"
              switchClass="bg-green-400"
            />
          </div>

          {form.new_arrival && (
            <div className="md:col-span-2">
              <label className={LABEL}>Auto-disable On</label>
              <input
                type="date"
                value={form.new_arrival_until}
                onChange={(e) => set$("new_arrival_until", e.target.value)}
                className={INPUT}
              />
            </div>
          )}

          <div className="md:col-span-2">
            <TogglePill
              active={form.bundle_only}
              onClick={() => set$("bundle_only", !form.bundle_only)}
              title="Bundle Product Only"
              subtitle="Can't be added to the cart on its own — only available through a bundle"
              activeClass="border-violet-400/50 bg-violet-400/10"
              switchClass="bg-violet-400"
            />
          </div>

          <div className="md:col-span-2">
            <TogglePill
              active={form.taxable}
              onClick={() => set$("taxable", !form.taxable)}
              title="Taxable"
              subtitle="Apply tax to this product's price"
              activeClass="border-primary/50 bg-primary/10"
            />
          </div>

          <div className="md:col-span-2">
            <TogglePill
              active={form.include_in_totals}
              onClick={() => set$("include_in_totals", !form.include_in_totals)}
              title="Include in Totals"
              subtitle="Count this product's stock value and profit in the Est. Total / Total Profit above"
              activeClass="border-green-400/50 bg-green-400/10"
              switchClass="bg-green-400"
            />
          </div>
        </div>
      </div>

      {/* ── Shipping ── */}
      <div className="bg-panel border border-line/30 p-5 rounded-lg">
        <p className="tabular-nums mb-1 text-[13px] font-semibold text-fg">Shipping</p>
        <p className="tabular-nums text-[11px] text-accent/60 mb-3">
          Used for the J&amp;T Express rate at checkout. An order ships in the largest pouch any of its products needs.
          Without a pouch size the rate is by weight.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={LABEL}>Pouch Size</label>
            <div className="flex flex-wrap gap-2">
              {(["", ...POUCH_SIZES] as const).map((size) => (
                <button
                  key={size || "none"}
                  type="button"
                  onClick={() => set$("pouch_size", size)}
                  className={`px-4 py-2 tabular-nums text-[11px] border transition-colors ${
                    form.pouch_size === size
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-line/50 text-accent/70 hover:border-accent/40 hover:text-fg"
                  }`}
                >
                  {size ? POUCH_LABEL[size] : "None"}
                </button>
              ))}
            </div>
          </div>
          {form.pouch_size === "small" && (
            <div>
              <label className={LABEL}>Quantity to upgrade to medium pouch</label>
              <input
                type="number"
                min="2"
                value={form.pouch_upgrade_medium_qty}
                onChange={(e) => set$("pouch_upgrade_medium_qty", e.target.value)}
                placeholder="e.g. 3 — leave blank to never upgrade"
                className={INPUT}
              />
            </div>
          )}
          {(form.pouch_size === "small" || form.pouch_size === "medium") && (
            <div>
              <label className={LABEL}>Quantity to upgrade to large pouch</label>
              <input
                type="number"
                min="2"
                value={form.pouch_upgrade_large_qty}
                onChange={(e) => set$("pouch_upgrade_large_qty", e.target.value)}
                placeholder="e.g. 6 — leave blank to never upgrade"
                className={INPUT}
              />
            </div>
          )}
          <div>
            <label className={LABEL}>Weight (kg per unit)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.weight}
              onChange={(e) => set$("weight", e.target.value)}
              placeholder="e.g. 0.25"
              className={INPUT}
            />
          </div>
        </div>
      </div>

      {/* ── Inventory ── */}
      <div className="bg-panel border border-line/30 p-5 rounded-lg">
        <p className="tabular-nums mb-3 text-[13px] font-semibold text-fg">Inventory</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Stock</label>
            <input type="number" min="0" value={form.stock} onChange={(e) => set$("stock", e.target.value)} placeholder="0" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Status</label>
            <select value={form.status} onChange={(e) => set$("status", e.target.value)} className={SELECT}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <TogglePill
              active={form.pre_order}
              onClick={() => set$("pre_order", !form.pre_order)}
              title="Pre-Order"
              subtitle={
                form.sneak_peek && !form.pre_order
                  ? "Turn off Sneak Peek first to enable Pre-Order"
                  : "Allow customers to place pre-orders for this product"
              }
              activeClass="border-orange-400/50 bg-orange-400/10"
              disabled={form.sneak_peek && !form.pre_order}
            />
          </div>

          {form.pre_order && (
            <div className="md:col-span-2">
              <label className="block tabular-nums text-[10px] uppercase text-orange-400/70 mb-1.5 tracking-wider font-medium">Pre-Order Note</label>
              <RichTextEditor value={form.pre_order_note} onChange={(html) => set$("pre_order_note", html)} />
            </div>
          )}

          {form.pre_order && (
            <div className="md:col-span-2">
              <TogglePill
                active={form.down_payment_required}
                onClick={() => set$("down_payment_required", !form.down_payment_required)}
                title="Required Down Payment"
                subtitle="Customers pay a down payment upfront — the pre-order is saved as Hold Pre-Order until you confirm it"
                activeClass="border-orange-400/50 bg-orange-400/10"
              />
            </div>
          )}

          {form.pre_order && form.down_payment_required && (
            <div className="md:col-span-2">
              <label className="block tabular-nums text-[10px] uppercase text-orange-400/70 mb-1.5 tracking-wider font-medium">
                Down Payment Price (₱ per unit)
              </label>
              <input
                type="number"
                min="1"
                value={form.down_payment_price}
                onChange={(e) => set$("down_payment_price", e.target.value)}
                placeholder="e.g. 500"
                className={INPUT}
              />
            </div>
          )}

          <div className="md:col-span-2">
            <TogglePill
              active={form.sneak_peek}
              onClick={() => set$("sneak_peek", !form.sneak_peek)}
              title="Sneak Peek"
              subtitle={
                form.pre_order && !form.sneak_peek
                  ? "Turn off Pre-Order first to enable Sneak Peek"
                  : "Show this product as a preview only — it can't be bought or added to the cart"
              }
              activeClass="border-sky-400/50 bg-sky-400/10"
              switchClass="bg-sky-400"
              disabled={form.pre_order && !form.sneak_peek}
            />
          </div>

          {form.sneak_peek && (
            <div className="md:col-span-2">
              <label className="block tabular-nums text-[10px] uppercase text-sky-400/70 mb-1.5 tracking-wider font-medium">Sneak Peek Note</label>
              <RichTextEditor value={form.sneak_peek_note} onChange={(html) => set$("sneak_peek_note", html)} />
            </div>
          )}

          <div className="md:col-span-2">
            <TogglePill
              active={form.max_purchase_enabled}
              onClick={() => set$("max_purchase_enabled", !form.max_purchase_enabled)}
              title="Maximum Purchase Limit"
              subtitle="Cap how many units of this product a single customer can buy"
              activeClass="border-blue-400/50 bg-blue-400/10"
            />
          </div>

          {form.max_purchase_enabled && (
            <div className="md:col-span-2">
              <label className={LABEL}>Maximum Purchase Limit (per customer)</label>
              <input
                type="number"
                min="1"
                value={form.max_purchase_limit}
                onChange={(e) => set$("max_purchase_limit", e.target.value)}
                placeholder="e.g. 2"
                className={INPUT}
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 tabular-nums text-[12px] text-red-400">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          {saving
            ? <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
            : <span className="material-symbols-outlined text-[14px]">save</span>
          }
          {saving ? "Saving…" : "Save Product"}
        </button>
      </div>
    </div>
  );
}
