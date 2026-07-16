"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import type { DbProduct, Taxonomy } from "@/lib/supabase";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

const INPUT = "w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20";
const LABEL = "block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5";
const SELECT = "w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors";

// ─── Image uploader ───────────────────────────────────────────────────────────

function ImageUploader({
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
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok) {
        onChange(json.url);
      } else {
        setError(json.error ?? "Upload failed.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
        {label}
      </p>
      <div
        className={`relative w-full ${aspectClass} bg-[#0e0e0e] border border-dashed border-[#603e39]/50 overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary transition-colors group`}
        onClick={() => ref.current?.click()}
      >
        {value ? (
          <>
            <Image src={value} alt={label} fill sizes="200px" className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-white text-[20px]">upload</span>
              <span className="font-mono text-white text-[11px] uppercase tracking-wider">
                Replace
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-[#ebbbb4]/30">
            {uploading ? (
              <span className="material-symbols-outlined animate-spin text-[24px] text-primary">
                progress_activity
              </span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[24px]">upload</span>
                <span className="font-mono text-[10px] uppercase tracking-widest">Upload</span>
              </>
            )}
          </div>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          className="mt-1 font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors"
        >
          Remove
        </button>
      )}
      {error && (
        <p className="mt-1 font-mono text-[10px] text-red-400">{error}</p>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
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
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...values];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    setError(null);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (res.ok) {
          uploaded.push(json.url);
        } else {
          setError(json.error ?? "Upload failed.");
        }
      } catch {
        setError("Network error.");
      }
    }
    onChange([...values, ...uploaded]);
    setUploading(false);
  };

  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
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
            className={`relative w-16 h-16 bg-[#0e0e0e] border overflow-hidden group cursor-move transition-colors ${
              overIndex === i && dragIndex !== null && dragIndex !== i ? "border-primary" : "border-[#603e39]/40"
            } ${dragIndex === i ? "opacity-40" : ""}`}
          >
            <Image src={url} alt="" fill sizes="64px" className="object-cover pointer-events-none" unoptimized draggable={false} />
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
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="w-16 h-16 flex flex-col items-center justify-center bg-[#0e0e0e] border border-dashed border-[#603e39]/50 hover:border-primary text-[#ebbbb4]/30 hover:text-primary transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">add</span>
          )}
        </button>
      </div>
      {error && (
        <p className="mt-1 font-mono text-[10px] text-red-400">{error}</p>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Toggle pill ──────────────────────────────────────────────────────────────

function TogglePill({
  active,
  onClick,
  title,
  subtitle,
  activeClass,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 border transition-colors ${
        active ? activeClass : "border-[#603e39]/50 bg-[#1f1f1f] hover:border-[#ebbbb4]/30"
      }`}
    >
      <div>
        <p className="font-mono text-[11px] tracking-widest uppercase text-left text-[#e2e2e2]">{title}</p>
        <p className="font-mono text-[10px] text-[#ebbbb4]/40 text-left mt-0.5">{subtitle}</p>
      </div>
      <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${active ? "bg-orange-400" : "bg-[#603e39]/40"}`}>
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
  taxable: boolean;
  max_purchase_enabled: boolean;
  max_purchase_limit: string;
  main_image: string;
  gallery_images: string[];
  social_image: string;
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
  taxable: false,
  max_purchase_enabled: false,
  max_purchase_limit: "",
  main_image: "",
  gallery_images: [],
  social_image: "",
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
    taxable: p.taxable ?? false,
    max_purchase_enabled: p.max_purchase_enabled ?? false,
    max_purchase_limit: p.max_purchase_limit ? String(p.max_purchase_limit) : "",
    main_image: p.main_image ?? p.image ?? "",
    gallery_images: p.gallery_images ?? [],
    social_image: p.social_image ?? "",
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
      <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-12">
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
          <Link href="/admin/products" className="inline-flex items-center gap-1 font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors mb-3">
            <span className="material-symbols-outlined text-[13px]">arrow_back</span>
            Back to Products
          </Link>
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
            ADMIN // PRODUCTS / {productId ? "EDIT" : "NEW"}
          </p>
          <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">
            {productId ? "Edit Product" : "Add Product"}
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
          {saving ? "Saving…" : "Save Product"}
        </button>
      </div>

      {/* ── Images ── */}
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-3 uppercase">Images</p>
        <div className="grid grid-cols-3 gap-4">
          <ImageUploader value={form.main_image} onChange={(url) => set$("main_image", url)} label="Main Image" aspectClass="aspect-square" />
          <ImageUploader value={form.social_image} onChange={(url) => set$("social_image", url)} label="Social Media" aspectClass="aspect-square" />
          <div className="col-span-3">
            <GalleryUploader values={form.gallery_images} onChange={(urls) => set$("gallery_images", urls)} />
          </div>
        </div>
      </div>

      {/* ── Details ── */}
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-3 uppercase">Details</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={LABEL}>Product Name <span className="text-primary">*</span></label>
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
              <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">No brands yet — add in Taxonomy.</p>
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
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-3 uppercase">Description</p>
        <RichTextEditor value={form.description} onChange={(html) => set$("description", html)} />
      </div>

      {/* ── Taxonomy ── */}
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-3 uppercase">Taxonomy</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Categories</label>
            {categories.length === 0 ? (
              <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">No categories yet — add them in Taxonomy.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const selected = form.category_ids.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleInArray("category_ids", c.id)}
                      className={`px-3 py-1.5 font-mono text-[11px] tracking-wide border transition-colors text-left ${
                        selected ? "border-primary bg-primary/10 text-primary" : "border-[#603e39]/50 text-[#ebbbb4]/50 hover:border-[#ebbbb4]/40 hover:text-[#e2e2e2]"
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
              <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">No tags yet — add them in Taxonomy.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const selected = form.tag_ids.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleInArray("tag_ids", t.id)}
                      className={`px-3 py-1.5 font-mono text-[11px] tracking-wide border transition-colors text-left ${
                        selected ? "border-orange-400/60 bg-orange-400/10 text-orange-400" : "border-[#603e39]/50 text-[#ebbbb4]/50 hover:border-[#ebbbb4]/40 hover:text-[#e2e2e2]"
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
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-3 uppercase">Pricing</p>
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
            <div className={`px-4 py-2.5 border font-mono text-[13px] font-bold ${formProfit >= 0 ? "border-green-400/30 bg-green-400/5 text-green-400" : "border-primary/30 bg-primary/5 text-primary"}`}>
              ₱{formProfit.toLocaleString()}
              {form.sale_price && <span className="font-normal text-[10px] ml-2 opacity-60">(on sale price)</span>}
            </div>
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
        </div>
      </div>

      {/* ── Inventory ── */}
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-3 uppercase">Inventory</p>
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
              subtitle="Allow customers to place pre-orders for this product"
              activeClass="border-orange-400/50 bg-orange-400/10"
            />
          </div>

          {form.pre_order && (
            <div className="md:col-span-2">
              <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-orange-400/70 mb-1.5">Pre-Order Note</label>
              <RichTextEditor value={form.pre_order_note} onChange={(html) => set$("pre_order_note", html)} />
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
        <p className="flex items-center gap-1.5 font-mono text-[12px] text-primary">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      )}

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
          {saving ? "Saving…" : "Save Product"}
        </button>
      </div>
    </div>
  );
}
