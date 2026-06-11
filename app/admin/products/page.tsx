"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { DbProduct, Taxonomy } from "@/lib/supabase";

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
            <Image src={value} alt={label} fill className="object-cover" unoptimized />
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
          <div key={i} className="relative w-16 h-16 bg-[#0e0e0e] border border-[#603e39]/40 overflow-hidden group">
            <Image src={url} alt="" fill className="object-cover" unoptimized />
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

// ─── Product form ─────────────────────────────────────────────────────────────

type FormState = {
  name: string;
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
  main_image: string;
  gallery_images: string[];
  social_image: string;
};

const EMPTY_FORM: FormState = {
  name: "",
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
  main_image: "",
  gallery_images: [],
  social_image: "",
};

function productToForm(p: DbProduct): FormState {
  return {
    name: p.name,
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
    main_image: p.main_image ?? p.image ?? "",
    gallery_images: p.gallery_images ?? [],
    social_image: p.social_image ?? "",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Taxonomy[]>([]);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [tags, setTags] = useState<Taxonomy[]>([]);
  const [modal, setModal] = useState<"new" | DbProduct | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const fetch$ = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/products");
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetch$();
    fetch("/api/admin/taxonomy")
      .then((r) => r.json())
      .then((data: Taxonomy[]) => {
        setBrands(data.filter((t) => t.type === "brand"));
        setCategories(data.filter((t) => t.type === "category"));
        setTags(data.filter((t) => t.type === "tag"));
      })
      .catch(() => {});
  }, []);

  const openNew = () => { setForm(EMPTY_FORM); setFormError(""); setModal("new"); };
  const openEdit = (p: DbProduct) => { setForm(productToForm(p)); setFormError(""); setModal(p); };
  const closeModal = () => setModal(null);

  const set$ = (key: keyof FormState, value: string | string[] | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleInArray = (key: "category_ids" | "tag_ids", id: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((x) => x !== id)
        : [...prev[key], id],
    }));

  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Product name is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const isEdit = modal !== "new" && modal !== null;
      const url = isEdit ? `/api/admin/products/${(modal as DbProduct).id}` : "/api/admin/products";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price || 0),
          sale_price: form.sale_price ? Number(form.sale_price) : null,
          cost: Number(form.cost || 0),
          stock: Number(form.stock || 0),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save.");
      }
      await fetch$();
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p: DbProduct) => {
    const newStatus = p.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeleting(null);
  };

  const profit = (p: DbProduct) => (p.sale_price ?? p.price) - p.cost;
  const formProfit =
    (form.sale_price ? Number(form.sale_price) : Number(form.price || 0)) -
    Number(form.cost || 0);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

  const thumb = (p: DbProduct) => p.main_image ?? (p.image || null);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-1 uppercase">
            ADMIN // PRODUCTS
          </p>
          <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">Products</h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-mono text-[11px] tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Product
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-10">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading products…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[#603e39]/40">
                {["Image", "Name", "SKU", "Stock", "Price", "Cost", "Profit", "Brands", "Date", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/40 px-3 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 font-mono text-[12px] text-[#ebbbb4]/30">
                    No products yet.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-[#603e39]/15 hover:bg-[#1a1a1a] transition-colors ${
                      p.status === "inactive" ? "opacity-40" : ""
                    }`}
                  >
                    {/* Image */}
                    <td className="px-3 py-3">
                      <div className="w-10 h-10 relative bg-[#111] border border-[#603e39]/20 overflow-hidden flex-shrink-0">
                        {thumb(p) ? (
                          <Image src={thumb(p)!} alt={p.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-[#ebbbb4]/20">
                              image
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-3 py-3">
                      <p className="font-inter font-bold text-[13px] text-[#e2e2e2] leading-tight max-w-[180px] truncate">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-[#ebbbb4]/40">{p.id}</span>
                        {p.pre_order && (
                          <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-px border border-orange-400/30 bg-orange-400/10 text-orange-400">
                            pre-order
                          </span>
                        )}
                        {p.status === "inactive" && (
                          <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-px border border-[#ebbbb4]/20 bg-[#ebbbb4]/5 text-[#ebbbb4]/40">
                            inactive
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-3 py-3 font-mono text-[12px] text-[#ebbbb4]/60 whitespace-nowrap">
                      {p.sku ?? <span className="text-[#ebbbb4]/20">—</span>}
                    </td>

                    {/* Stock */}
                    <td className="px-3 py-3">
                      <span
                        className={`font-mono text-[12px] font-bold ${
                          p.stock === 0
                            ? "text-primary"
                            : p.stock <= 5
                            ? "text-yellow-400"
                            : "text-green-400"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {p.sale_price ? (
                        <div className="flex flex-col leading-tight">
                          <span className="font-mono text-[12px] font-bold text-primary">
                            ₱{p.sale_price.toLocaleString()}
                          </span>
                          <span className="font-mono text-[10px] text-[#ebbbb4]/40 line-through">
                            ₱{p.price.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-[12px] text-[#e2e2e2]">
                          ₱{p.price.toLocaleString()}
                        </span>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="px-3 py-3 font-mono text-[12px] text-[#ebbbb4]/60 whitespace-nowrap">
                      {p.cost > 0 ? `₱${p.cost.toLocaleString()}` : <span className="text-[#ebbbb4]/20">—</span>}
                    </td>

                    {/* Profit */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {p.cost > 0 ? (
                        <span
                          className={`font-mono text-[12px] font-bold ${
                            profit(p) >= 0 ? "text-green-400" : "text-primary"
                          }`}
                        >
                          ₱{profit(p).toLocaleString()}
                        </span>
                      ) : (
                        <span className="font-mono text-[12px] text-[#ebbbb4]/20">—</span>
                      )}
                    </td>

                    {/* Brands */}
                    <td className="px-3 py-3 font-mono text-[12px] text-[#ebbbb4]/60 max-w-[120px] truncate">
                      {p.brand_id && brandMap[p.brand_id]
                        ? brandMap[p.brand_id]
                        : <span className="text-[#ebbbb4]/20">—</span>}
                    </td>

                    {/* Date */}
                    <td className="px-3 py-3 font-mono text-[11px] text-[#ebbbb4]/40 whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="w-7 h-7 flex items-center justify-center border border-[#603e39]/40 text-[#ebbbb4]/50 hover:border-primary hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                        </button>
                        <button
                          onClick={() => toggleStatus(p)}
                          className="w-7 h-7 flex items-center justify-center border border-[#603e39]/40 text-[#ebbbb4]/50 hover:border-blue-400 hover:text-blue-400 transition-colors"
                          title={p.status === "active" ? "Disable" : "Enable"}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {p.status === "active" ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="w-7 h-7 flex items-center justify-center border border-[#603e39]/40 text-[#ebbbb4]/50 hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ── */}
      {modal !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/85 backdrop-blur-sm"
        >
          <div className="w-full max-w-2xl bg-[#131313] border border-[#603e39]/50 flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#603e39]/30 flex-shrink-0">
              <h2 className="font-inter font-bold text-[18px] uppercase text-[#e2e2e2]">
                {modal === "new" ? "Add Product" : "Edit Product"}
              </h2>
              <button onClick={closeModal} className="text-[#ebbbb4]/40 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal body (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* ── Images ── */}
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-3 uppercase">
                  Images
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <ImageUploader
                    value={form.main_image}
                    onChange={(url) => set$("main_image", url)}
                    label="Main Image"
                    aspectClass="aspect-square"
                  />
                  <ImageUploader
                    value={form.social_image}
                    onChange={(url) => set$("social_image", url)}
                    label="Social Media"
                    aspectClass="aspect-square"
                  />
                  <div className="col-span-3">
                    <GalleryUploader
                      values={form.gallery_images}
                      onChange={(urls) => set$("gallery_images", urls)}
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-[#603e39]/20" />

              {/* ── Details ── */}
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-3 uppercase">
                  Details
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                      Product Name <span className="text-primary">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => set$("name", e.target.value)}
                      placeholder="e.g. CX-13 Bahamut Blitz"
                      className="w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                      SKU
                    </label>
                    <input
                      value={form.sku}
                      onChange={(e) => set$("sku", e.target.value)}
                      placeholder="e.g. CX13-BK1"
                      className="w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                      Brand
                    </label>
                    {brands.length === 0 ? (
                      <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">
                        No brands yet — add in Taxonomy.
                      </p>
                    ) : (
                      <select
                        value={form.brand_id}
                        onChange={(e) => set$("brand_id", e.target.value)}
                        className="w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="">— No brand —</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-px bg-[#603e39]/20" />

              {/* ── Taxonomy ── */}
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-3 uppercase">
                  Taxonomy
                </p>
                <div className="grid grid-cols-2 gap-4">

                  {/* Categories — left column */}
                  <div>
                    <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                      Categories
                    </label>
                    {categories.length === 0 ? (
                      <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">
                        No categories yet — add them in Taxonomy.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {categories.map((c) => {
                          const selected = form.category_ids.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleInArray("category_ids", c.id)}
                              className={`px-3 py-1.5 font-mono text-[11px] tracking-wide border transition-colors text-left ${
                                selected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-[#603e39]/50 text-[#ebbbb4]/50 hover:border-[#ebbbb4]/40 hover:text-[#e2e2e2]"
                              }`}
                            >
                              {selected && (
                                <span className="material-symbols-outlined text-[11px] mr-1 align-middle">
                                  check
                                </span>
                              )}
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tags — right column */}
                  <div>
                    <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                      Tags
                    </label>
                    {tags.length === 0 ? (
                      <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">
                        No tags yet — add them in Taxonomy.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {tags.map((t) => {
                          const selected = form.tag_ids.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleInArray("tag_ids", t.id)}
                              className={`px-3 py-1.5 font-mono text-[11px] tracking-wide border transition-colors text-left ${
                                selected
                                  ? "border-orange-400/60 bg-orange-400/10 text-orange-400"
                                  : "border-[#603e39]/50 text-[#ebbbb4]/50 hover:border-[#ebbbb4]/40 hover:text-[#e2e2e2]"
                              }`}
                            >
                              {selected && (
                                <span className="material-symbols-outlined text-[11px] mr-1 align-middle">
                                  check
                                </span>
                              )}
                              {t.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              <div className="h-px bg-[#603e39]/20" />

              {/* ── Pricing ── */}
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-3 uppercase">
                  Pricing
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "price", label: "Regular Price (₱)" },
                    { key: "sale_price", label: "Sale Price (₱)", placeholder: "Leave blank if no sale" },
                    { key: "cost", label: "Cost (₱)" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                        {label}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form[key as keyof FormState] as string}
                        onChange={(e) => set$(key as keyof FormState, e.target.value)}
                        placeholder={placeholder ?? "0"}
                        className="w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                      Profit
                    </label>
                    <div
                      className={`px-4 py-2.5 border font-mono text-[13px] font-bold ${
                        formProfit >= 0
                          ? "border-green-400/30 bg-green-400/5 text-green-400"
                          : "border-primary/30 bg-primary/5 text-primary"
                      }`}
                    >
                      ₱{formProfit.toLocaleString()}
                      {form.sale_price && (
                        <span className="font-normal text-[10px] ml-2 opacity-60">
                          (on sale price)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-[#603e39]/20" />

              {/* ── Inventory ── */}
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-3 uppercase">
                  Inventory
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                      Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => set$("stock", e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => set$("status", e.target.value)}
                      className="w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Pre-Order toggle */}
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={() => set$("pre_order", !form.pre_order)}
                      className={`w-full flex items-center justify-between px-4 py-3 border transition-colors ${
                        form.pre_order
                          ? "border-orange-400/50 bg-orange-400/10"
                          : "border-[#603e39]/50 bg-[#1f1f1f] hover:border-[#ebbbb4]/30"
                      }`}
                    >
                      <div>
                        <p className="font-mono text-[11px] tracking-widest uppercase text-left text-[#e2e2e2]">
                          Pre-Order
                        </p>
                        <p className="font-mono text-[10px] text-[#ebbbb4]/40 text-left mt-0.5">
                          Allow customers to place pre-orders for this product
                        </p>
                      </div>
                      <div
                        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                          form.pre_order ? "bg-orange-400" : "bg-[#603e39]/40"
                        }`}
                      >
                        <span
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                          style={{ transform: `translateX(${form.pre_order ? "0.125rem" : "-1.125rem"})` }}
                        />
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {formError && (
                <p className="flex items-center gap-1.5 font-mono text-[12px] text-primary">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {formError}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-[#603e39]/30 flex-shrink-0">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 border border-[#603e39]/50 text-[#ebbbb4]/50 font-mono text-[11px] tracking-widest uppercase hover:border-[#ebbbb4]/40 hover:text-[#ebbbb4] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-primary text-white font-mono text-[11px] tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? "Saving…" : modal === "new" ? "Add Product" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
