"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DbProduct, Taxonomy } from "@/lib/supabase";
import { reorderVisible } from "@/lib/reorder";
import { TogglePill } from "./_form";
import { sizedImageUrl } from "@/lib/image-sizes";

type SortKey = "name" | "sku" | "stock" | "brand";

const toSlug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function ProductTitleLink({ p, className }: { p: DbProduct; className: string }) {
  if (!p.slug) return <p className={className}>{p.name}</p>;
  return (
    <a
      href={`/product/${p.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      title="View on store"
      onClick={(e) => e.stopPropagation()}
      className={`${className} block hover:text-primary hover:underline underline-offset-2 transition-colors`}
    >
      {p.name}
    </a>
  );
}

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
const thumbOf = (p: DbProduct) => p.main_image ?? (p.image || null);

// ── Quick edit ────────────────────────────────────────────────────────────────
function QuickEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: DbProduct;
  onClose: () => void;
  onSaved: (p: DbProduct) => void;
}) {
  const [name, setName] = useState(product.name);
  const [stock, setStock] = useState(String(product.stock));
  const [price, setPrice] = useState(String(product.price));
  const [salePrice, setSalePrice] = useState(product.sale_price != null ? String(product.sale_price) : "");
  const [cost, setCost] = useState(String(product.cost));
  const [taxable, setTaxable] = useState(product.taxable);
  const [preOrder, setPreOrder] = useState(product.pre_order);
  const [sneakPeek, setSneakPeek] = useState(product.sneak_peek);
  const [bundleOnly, setBundleOnly] = useState(product.bundle_only ?? false);
  const [newArrival, setNewArrival] = useState(product.new_arrival);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const img = thumbOf(product);
  const num = (s: string) => (s.trim() === "" ? 0 : Number(s));
  const effectivePrice = salePrice.trim() !== "" ? num(salePrice) : num(price);
  const unitProfit = effectivePrice - num(cost);

  const invalid =
    name.trim() === "" ||
    [stock, price, cost].some((v) => v.trim() === "" || !Number.isFinite(Number(v))) ||
    (salePrice.trim() !== "" && !Number.isFinite(Number(salePrice)));

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        stock: num(stock),
        price: num(price),
        sale_price: salePrice.trim() === "" ? null : num(salePrice),
        cost: num(cost),
        taxable,
        pre_order: preOrder,
        sneak_peek: sneakPeek,
        bundle_only: bundleOnly,
        new_arrival: newArrival,
      }),
    });
    if (res.ok) {
      onSaved(await res.json());
      return;
    }
    const body = await res.json().catch(() => ({}));
    setError(body.error ?? "Failed to save changes.");
    setSaving(false);
  };

  const label = "block tabular-nums text-[10px] uppercase text-accent/60 mb-1 tracking-wider font-medium";
  const field =
    "w-full bg-deep border border-line/40 text-fg tabular-nums text-[12px] px-3 py-2 focus:outline-none focus:border-primary transition-colors rounded-md focus:ring-2 focus:ring-primary/20";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-panel border border-line/40 rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/30 px-5 py-3">
          <div>
            <p className="tabular-nums text-[13px] font-semibold text-fg">Quick Edit</p>
            <p className="tabular-nums text-[11px] text-accent/60">{product.sku ?? "No SKU"}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-accent/60 hover:text-primary transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Image + name */}
          <div className="flex gap-4">
            <div className="relative w-24 h-24 flex-shrink-0 bg-deep border border-line/20 overflow-hidden rounded-md">
              {img ? (
                <Image
                  src={sizedImageUrl(img, "small") ?? img}
                  alt={product.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                  onError={(e) => {
                    if (e.currentTarget.src !== img) e.currentTarget.src = img;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-accent/40">image</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label className={label} htmlFor="qe-name">Product Name</label>
              <input
                id="qe-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={field}
                autoFocus
              />
              <div className="mt-3">
                <label className={label} htmlFor="qe-stock">Stocks</label>
                <input
                  id="qe-stock"
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={field}
                />
              </div>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="qe-price">Regular Price</label>
              <input id="qe-price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="qe-sale">Sale Price</label>
              <input id="qe-sale" type="number" min={0} step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="—" className={field} />
            </div>
            <div>
              <label className={label} htmlFor="qe-cost">Cost</label>
              <input id="qe-cost" type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={field} />
            </div>
            <div>
              <span className={label}>Profit / unit</span>
              <p className={`tabular-nums text-[12px] font-bold px-3 py-2 border border-line/20 bg-deep rounded-md ${unitProfit >= 0 ? "text-green-400" : "text-primary"}`}>
                {num(cost) > 0 ? peso(unitProfit) : "—"}
              </p>
            </div>
          </div>

          {/* Flags */}
          <div className="space-y-2">
            <TogglePill
              active={preOrder}
              onClick={() => setPreOrder((v) => !v)}
              title="Pre-Order"
              subtitle={
                sneakPeek && !preOrder
                  ? "Turn off Sneak Peek first to enable Pre-Order"
                  : "Allow customers to place pre-orders for this product"
              }
              activeClass="border-orange-400/50 bg-orange-400/10"
              disabled={sneakPeek && !preOrder}
            />
            <TogglePill
              active={sneakPeek}
              onClick={() => setSneakPeek((v) => !v)}
              title="Sneak Peek"
              subtitle={
                preOrder && !sneakPeek
                  ? "Turn off Pre-Order first to enable Sneak Peek"
                  : "Show this product as a preview only — it can't be bought or added to the cart"
              }
              activeClass="border-sky-400/50 bg-sky-400/10"
              switchClass="bg-sky-400"
              disabled={preOrder && !sneakPeek}
            />
            <TogglePill
              active={newArrival}
              onClick={() => setNewArrival((v) => !v)}
              title="New Arrival"
              subtitle="Feature this product as a new arrival"
              activeClass="border-green-400/50 bg-green-400/10"
              switchClass="bg-green-400"
            />
            <TogglePill
              active={bundleOnly}
              onClick={() => setBundleOnly((v) => !v)}
              title="Bundle Product Only"
              subtitle="Can't be added to the cart on its own — only available through a bundle"
              activeClass="border-violet-400/50 bg-violet-400/10"
              switchClass="bg-violet-400"
            />
            <TogglePill
              active={taxable}
              onClick={() => setTaxable((v) => !v)}
              title="Taxable"
              subtitle="Apply tax to this product's price"
              activeClass="border-primary/50 bg-primary/10"
            />
          </div>

          {error && <p className="tabular-nums text-[11px] text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-line/30 px-5 py-3">
          <button
            onClick={onClose}
            className="px-4 py-2 tabular-nums text-[11px] text-accent/60 hover:text-fg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || invalid}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white tabular-nums text-[11px] hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-sm"
          >
            {saving && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminProductsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const visibility = searchParams.get("visibility") ?? "active";
  const categoryFilter = searchParams.get("category") ?? "all";
  const brandFilter = searchParams.get("brand") ?? "all";
  const preorderFilter = searchParams.get("preorder") === "1";
  const sneakPeekFilter = searchParams.get("sneakpeek") === "1";
  const taxableFilter = searchParams.get("taxable") === "1";

  const setParam = (key: string, value: string, def: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === def) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Taxonomy[]>([]);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  // Drag-and-drop reorder. The ref is what the drag handlers read (always current);
  // the state only drives the visuals.
  const dragIdRef = useRef<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [quickEdit, setQuickEdit] = useState<DbProduct | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

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
      })
      .catch(() => {});
  }, []);

  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  // ── Derived list ────────────────────────────────────────────────────────────
  const isFiltered = q.trim() !== "" || visibility !== "all" || categoryFilter !== "all" || brandFilter !== "all" || preorderFilter || sneakPeekFilter || taxableFilter || sort !== null;

  const displayed = (() => {
    let list = [...products];
    if (q.trim()) {
      const query = q.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(query) || (p.sku ?? "").toLowerCase().includes(query));
    }
    if (visibility === "active") list = list.filter((p) => p.status === "active");
    else if (visibility === "inactive") list = list.filter((p) => p.status === "inactive");
    if (categoryFilter !== "all") list = list.filter((p) => p.category_ids?.includes(categoryFilter));
    if (brandFilter !== "all") list = list.filter((p) => p.brand_id === brandFilter);
    if (preorderFilter) list = list.filter((p) => p.pre_order);
    if (sneakPeekFilter) list = list.filter((p) => p.sneak_peek);
    if (taxableFilter) list = list.filter((p) => p.taxable);
    if (sort) {
      list.sort((a, b) => {
        let va: string | number;
        let vb: string | number;
        switch (sort.key) {
          case "name": va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
          case "sku": va = (a.sku ?? "").toLowerCase(); vb = (b.sku ?? "").toLowerCase(); break;
          case "stock": va = a.stock; vb = b.stock; break;
          case "brand":
            va = (brandMap[a.brand_id ?? ""] ?? "").toLowerCase();
            vb = (brandMap[b.brand_id ?? ""] ?? "").toLowerCase();
            break;
          default: va = 0; vb = 0;
        }
        if (va < vb) return sort.dir === "asc" ? -1 : 1;
        if (va > vb) return sort.dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  })();

  // Inventory value / profit for the products currently listed (respects filters & search).
  // Profit only counts products that have a cost recorded — the table shows "—" for the rest.
  const totals = displayed.reduce(
    (acc, p) => {
      const unit = p.sale_price ?? p.price;
      const qty = Math.max(0, p.stock);
      acc.value += unit * qty;
      if (p.cost > 0) acc.profit += (unit - p.cost) * qty;
      else acc.noCost += 1;
      return acc;
    },
    { value: 0, profit: 0, noCost: 0 }
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeleting(null);
  };

  const handleDuplicate = async (p: DbProduct) => {
    setDuplicating(p.id);
    const name = `${p.name} (Copy)`;
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: toSlug(name),
        description: p.description,
        sku: p.sku,
        price: p.price,
        sale_price: p.sale_price,
        cost: p.cost,
        stock: p.stock,
        brand_id: p.brand_id,
        category_ids: p.category_ids,
        tag_ids: p.tag_ids,
        status: p.status,
        pre_order: p.pre_order,
        pre_order_note: p.pre_order_note,
        sneak_peek: p.sneak_peek,
        sneak_peek_note: p.sneak_peek_note,
        bundle_only: p.bundle_only,
        taxable: p.taxable,
        main_image: p.main_image,
        gallery_images: p.gallery_images,
        social_image: p.social_image,
      }),
    });
    if (res.ok) await fetch$();
    setDuplicating(null);
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

  // ── Reorder (drag & drop) ────────────────────────────────────────────────────
  // Works under any filter or search: the visible products are re-arranged
  // among the positions they already occupy in the full list, so products the
  // filter hides keep their place. Only a column sort disables it, because
  // then the on-screen order isn't the store order.
  const canReorder = sort === null && !savingOrder;

  const endDrag = () => {
    dragIdRef.current = null;
    setDragId(null);
    setOverId(null);
  };

  const reorderProducts = async (fromId: string, toId: string) => {
    const result = reorderVisible(products, displayed, fromId, toId);
    if (!result) return;
    const { next, changed } = result;

    const previous = products;
    setProducts(next);
    setSavingOrder(true);
    setReorderError(null);
    try {
      const res = await fetch("/api/admin/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: changed }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProducts(previous);
      setReorderError("Couldn't save the new order — it was put back.");
      setTimeout(() => setReorderError(null), 5000);
    } finally {
      setSavingOrder(false);
    }
  };

  // Row-level drop target props (shared by the mobile cards and the table rows).
  const dropTarget = (id: string) => {
    let indicator = "";
    if (dragId && overId === id && dragId !== id) {
      const from = displayed.findIndex((p) => p.id === dragId);
      const to = displayed.findIndex((p) => p.id === id);
      indicator = from < to ? "below" : "above";
    }
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!dragIdRef.current || !canReorder) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOverId((cur) => (cur === id ? cur : id));
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const fromId = dragIdRef.current;
        endDrag();
        if (fromId) reorderProducts(fromId, id);
      },
      indicator,
      dragging: dragId === id,
    };
  };

  // The move handle. A plain function (not a component) on purpose: a component
  // defined in here would be re-created on every render, and remounting the
  // element mid-drag cancels the drag.
  const renderHandle = (p: DbProduct) => (
    <span
      draggable={canReorder}
      onDragStart={(e) => {
        if (!canReorder) return;
        const row = e.currentTarget.closest("[data-product-row]");
        if (row) e.dataTransfer.setDragImage(row, 16, 16);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", p.id);
        dragIdRef.current = p.id;
        // Defer the visual change: restyling the row inside dragstart can cancel the drag.
        setTimeout(() => setDragId(p.id), 0);
      }}
      onDragEnd={endDrag}
      title={sort !== null ? "Clear the column sort to reorder" : "Drag to reorder"}
      className={`w-7 h-7 flex items-center justify-center flex-shrink-0 select-none transition-colors ${
        canReorder
          ? "cursor-move text-accent/60 hover:text-primary"
          : "cursor-not-allowed text-accent/15"
      }`}
    >
      <span className="material-symbols-outlined text-[18px] pointer-events-none">open_with</span>
    </span>
  );

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const profit = (p: DbProduct) => (p.sale_price ?? p.price) - p.cost;
  const thumb = thumbOf;

  const thBase = "text-left tabular-nums text-[10px] uppercase text-accent/60 px-3 py-3 whitespace-nowrap tracking-wider font-medium";

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );

  const SortTh = ({ label, sortKey }: { label: string; sortKey: SortKey }) => {
    const active = sort?.key === sortKey;
    return (
      <th onClick={() => toggleSort(sortKey)} className={`${thBase} cursor-pointer hover:text-accent/70 select-none transition-colors`}>
        <span className="flex items-center gap-1">
          {label}
          <span className={`material-symbols-outlined text-[11px] transition-opacity ${active ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50"}`}>
            {active && sort?.dir === "desc" ? "arrow_downward" : "arrow_upward"}
          </span>
        </span>
      </th>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-semibold text-fg text-[22px] tracking-tight">Products</h1>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white tabular-nums text-[11px] hover:bg-primary/90 transition-all font-medium shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Product
        </Link>
      </div>

      {/* Search + totals */}
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-3">
        <div className="flex items-center gap-2 bg-panel border border-line/40 focus-within:border-primary px-4 py-2.5 transition-colors w-full sm:flex-1 sm:max-w-xs rounded-lg">
          <span className="material-symbols-outlined text-accent/50 text-[16px]">search</span>
          <input
            type="text"
            placeholder="Search by name or SKU…"
            value={q}
            onChange={(e) => setParam("q", e.target.value, "")}
            className="flex-1 bg-transparent text-fg tabular-nums text-[12px] focus:outline-none placeholder:text-accent/40"
          />
          {q && (
            <button onClick={() => setParam("q", "", "")} className="text-accent/50 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <div
            className="flex items-center gap-2.5 bg-panel border border-line/40 px-4 py-2 rounded-lg"
            title={`Retail value of stock on hand across the ${displayed.length} listed product${displayed.length === 1 ? "" : "s"}`}
          >
            <span className="material-symbols-outlined text-accent/50 text-[18px]">inventory_2</span>
            <div className="leading-tight">
              <p className="tabular-nums text-[9px] uppercase text-accent/60 whitespace-nowrap tracking-wider font-medium">Est. Total</p>
              <p className="tabular-nums text-[14px] font-bold text-fg whitespace-nowrap">{peso(totals.value)}</p>
            </div>
          </div>

          <div
            className="flex items-center gap-2.5 bg-panel border border-line/40 px-4 py-2 rounded-lg"
            title={
              totals.noCost > 0
                ? `${totals.noCost} listed product${totals.noCost === 1 ? " has" : "s have"} no cost recorded and ${totals.noCost === 1 ? "is" : "are"} excluded`
                : "Profit on stock on hand across the listed products"
            }
          >
            <span className="material-symbols-outlined text-accent/50 text-[18px]">trending_up</span>
            <div className="leading-tight">
              <p className="tabular-nums text-[9px] uppercase text-accent/60 whitespace-nowrap tracking-wider font-medium">
                Total Profit{totals.noCost > 0 && <span className="text-accent/45">*</span>}
              </p>
              <p className={`tabular-nums text-[14px] font-bold whitespace-nowrap ${totals.profit >= 0 ? "text-green-400" : "text-primary"}`}>
                {peso(totals.profit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={visibility}
          onChange={(e) => setParam("visibility", e.target.value, "active")}
          className="bg-deep border border-line/40 text-accent/60 tabular-nums text-[10px] uppercase px-3 py-1.5 focus:outline-none focus:border-primary transition-colors tracking-wider font-medium rounded-md focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Products</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setParam("category", e.target.value, "all")}
          className="bg-deep border border-line/40 text-accent/60 tabular-nums text-[10px] uppercase px-3 py-1.5 focus:outline-none focus:border-primary transition-colors tracking-wider font-medium rounded-md focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={brandFilter}
          onChange={(e) => setParam("brand", e.target.value, "all")}
          className="bg-deep border border-line/40 text-accent/60 tabular-nums text-[10px] uppercase px-3 py-1.5 focus:outline-none focus:border-primary transition-colors tracking-wider font-medium rounded-md focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <button
          onClick={() => setParam("preorder", preorderFilter ? "" : "1", "")}
          className={`px-3 py-1.5 tabular-nums text-[10px] uppercase border transition-colors tracking-wider font-medium ${
            preorderFilter
              ? "border-orange-400/60 bg-orange-400/10 text-orange-400"
              : "border-line/40 text-accent/60 hover:border-accent/30 hover:text-accent/70"
          }`}
        >
          Pre-Order
        </button>

        <button
          onClick={() => setParam("sneakpeek", sneakPeekFilter ? "" : "1", "")}
          className={`px-3 py-1.5 tabular-nums text-[10px] uppercase border transition-colors tracking-wider font-medium ${
            sneakPeekFilter
              ? "border-sky-400/60 bg-sky-400/10 text-sky-400"
              : "border-line/40 text-accent/60 hover:border-accent/30 hover:text-accent/70"
          }`}
        >
          Sneak Peek
        </button>

        <button
          onClick={() => setParam("taxable", taxableFilter ? "" : "1", "")}
          className={`px-3 py-1.5 tabular-nums text-[10px] uppercase border transition-colors tracking-wider font-medium ${
            taxableFilter
              ? "border-primary bg-primary/10 text-primary"
              : "border-line/40 text-accent/60 hover:border-accent/30 hover:text-accent/70"
          }`}
        >
          Taxable
        </button>

        {/* Clear filters */}
        {isFiltered && (
          <button
            onClick={() => {
              setSort(null);
              router.replace(pathname, { scroll: false });
            }}
            className="flex items-center gap-1 tabular-nums text-[10px] uppercase text-accent/50 hover:text-primary transition-colors tracking-wider font-medium"
          >
            <span className="material-symbols-outlined text-[12px]">close</span>
            Clear
          </button>
        )}

        {reorderError && (
          <span className="tabular-nums text-[10px] text-red-400">{reorderError}</span>
        )}

        {/* Count */}
        <span className="ml-auto tabular-nums text-[10px] text-accent/50">
          {displayed.length} / {products.length}
        </span>
      </div>

      {/* Product list */}
      {loading ? (
        <div className="flex items-center gap-2 tabular-nums text-[12px] text-accent/60 py-10">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading products…
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 tabular-nums text-[12px] text-accent/50">
          {isFiltered ? "No products match the current filters." : "No products yet."}
        </div>
      ) : (
        <>
          {/* ── Mobile cards (hidden on md+) ── */}
          <div className="md:hidden space-y-2">
            {displayed.map((p) => {
              const drop = dropTarget(p.id);
              return (
                <div
                  key={p.id}
                  data-product-row
                  onDragOver={drop.onDragOver}
                  onDrop={drop.onDrop}
                  className={`flex gap-2 bg-panel border border-line/30 p-3 rounded-lg ${
                    p.status === "inactive" ? "opacity-40" : ""
                  } ${drop.dragging ? "!opacity-30" : ""} ${
                    drop.indicator === "above" ? "shadow-[inset_0_2px_0_0_rgb(var(--c-primary))]" : drop.indicator === "below" ? "shadow-[inset_0_-2px_0_0_rgb(var(--c-primary))]" : ""
                  }`}
                >
                  {/* Move handle */}
                  <div className="flex items-center -ml-1">{renderHandle(p)}</div>

                  {/* Left: image */}
                  <div className="relative w-16 h-16 flex-shrink-0 bg-deep border border-line/20 overflow-hidden rounded-md">
                    {thumb(p) ? (
                      <Image
                        src={sizedImageUrl(thumb(p), "small") ?? thumb(p)!}
                        alt={p.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                        onError={(e) => {
                          const original = thumb(p)!;
                          if (e.currentTarget.src !== original) e.currentTarget.src = original;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] text-accent/40">image</span>
                      </div>
                    )}
                  </div>

                  {/* Right: details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Row 1: name + badges */}
                    <div className="flex items-start gap-2 flex-wrap">
                      <ProductTitleLink p={p} className="font-bold text-[13px] text-fg leading-tight truncate" />
                      {p.pre_order && (
                        <span className="tabular-nums text-[9px] uppercase px-1.5 py-px border border-orange-400/30 bg-orange-400/10 text-orange-400 flex-shrink-0 tracking-wider font-medium rounded">
                          pre-order
                        </span>
                      )}
                      {p.sneak_peek && (
                        <span className="tabular-nums text-[9px] uppercase px-1.5 py-px border border-sky-400/30 bg-sky-400/10 text-sky-400 flex-shrink-0 tracking-wider font-medium rounded">
                          sneak peek
                        </span>
                      )}
                      {p.status === "inactive" && (
                        <span className="tabular-nums text-[9px] uppercase px-1.5 py-px border border-accent/20 bg-accent/5 text-accent/60 flex-shrink-0 tracking-wider font-medium rounded">
                          inactive
                        </span>
                      )}
                    </div>

                    {/* Row 2: brand | Stocks */}
                    <p className="tabular-nums text-[11px] text-accent/70">
                      <span>{p.brand_id && brandMap[p.brand_id] ? brandMap[p.brand_id] : "—"}</span>
                      <span className="mx-1.5 text-line/60">|</span>
                      <span>
                        Stocks:{" "}
                        <span className={`font-bold ${p.stock === 0 ? "text-red-400" : p.stock <= 5 ? "text-yellow-400" : "text-green-400"}`}>
                          {p.stock}
                        </span>
                      </span>
                    </p>

                    {/* Row 3: Price | Cost | Profit */}
                    <p className="tabular-nums text-[11px] text-accent/70 flex flex-wrap gap-x-3">
                      <span>
                        Price:{" "}
                        <span className="text-fg font-bold">
                          ₱{(p.sale_price ?? p.price).toLocaleString()}
                        </span>
                        {p.sale_price && (
                          <span className="line-through text-accent/50 ml-1">₱{p.price.toLocaleString()}</span>
                        )}
                      </span>
                      <span>
                        Cost:{" "}
                        <span className="text-fg">
                          {p.cost > 0 ? `₱${p.cost.toLocaleString()}` : "—"}
                        </span>
                      </span>
                      <span>
                        Profit:{" "}
                        <span className={`font-bold ${profit(p) >= 0 ? "text-green-400" : "text-primary"}`}>
                          {p.cost > 0 ? `₱${profit(p).toLocaleString()}` : "—"}
                        </span>
                      </span>
                    </p>

                    {/* Row 4: actions */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button onClick={() => setQuickEdit(p)} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-primary hover:text-primary transition-colors" title="Quick edit">
                        <span className="material-symbols-outlined text-[13px]">bolt</span>
                      </button>
                      <Link href={`/admin/products/${p.id}`} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-primary hover:text-primary transition-colors" title="Edit">
                        <span className="material-symbols-outlined text-[13px]">edit</span>
                      </Link>
                      <button onClick={() => handleDuplicate(p)} disabled={duplicating === p.id} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-primary hover:text-primary transition-colors disabled:opacity-40" title="Duplicate">
                        <span className="material-symbols-outlined text-[13px]">{duplicating === p.id ? "progress_activity" : "content_copy"}</span>
                      </button>
                      <button onClick={() => toggleStatus(p)} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-blue-400 hover:text-blue-400 transition-colors" title={p.status === "active" ? "Disable" : "Enable"}>
                        <span className="material-symbols-outlined text-[13px]">{p.status === "active" ? "visibility_off" : "visibility"}</span>
                      </button>
                      <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-40" title="Delete">
                        <span className="material-symbols-outlined text-[13px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Desktop table (hidden below md) ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-line/40 group">
                  <th className={`${thBase} w-8 px-1`}></th>
                  <th className={thBase}>Image</th>
                  <SortTh label="Name" sortKey="name" />
                  <SortTh label="SKU" sortKey="sku" />
                  <SortTh label="Stock" sortKey="stock" />
                  <th className={thBase}>Price</th>
                  <th className={thBase}>Cost</th>
                  <th className={thBase}>Profit</th>
                  <SortTh label="Brand" sortKey="brand" />
                  <th className={thBase}></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((p) => {
                  const drop = dropTarget(p.id);
                  return (
                    <tr
                      key={p.id}
                      data-product-row
                      onDragOver={drop.onDragOver}
                      onDrop={drop.onDrop}
                      className={`border-b border-line/15 hover:bg-panel transition-colors ${p.status === "inactive" ? "opacity-40" : ""} ${drop.dragging ? "!opacity-30" : ""} ${
                        drop.indicator === "above" ? "[&>td]:shadow-[inset_0_2px_0_0_rgb(var(--c-primary))]" : drop.indicator === "below" ? "[&>td]:shadow-[inset_0_-2px_0_0_rgb(var(--c-primary))]" : ""
                      }`}
                    >
                      <td className="pl-2 pr-0 py-3 w-8">{renderHandle(p)}</td>
                      <td className="px-3 py-3">
                        <div className="w-10 h-10 relative bg-deep border border-line/20 overflow-hidden flex-shrink-0 rounded-md">
                          {thumb(p) ? (
                            <Image
                              src={sizedImageUrl(thumb(p), "small") ?? thumb(p)!}
                              alt={p.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                              onError={(e) => {
                                const original = thumb(p)!;
                                if (e.currentTarget.src !== original) e.currentTarget.src = original;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-[14px] text-accent/40">image</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <ProductTitleLink p={p} className="font-bold text-[13px] text-fg leading-tight max-w-[180px] truncate" />
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {p.pre_order && <span className="tabular-nums text-[9px] uppercase px-1.5 py-px border border-orange-400/30 bg-orange-400/10 text-orange-400 tracking-wider font-medium rounded">pre-order</span>}
                          {p.sneak_peek && <span className="tabular-nums text-[9px] uppercase px-1.5 py-px border border-sky-400/30 bg-sky-400/10 text-sky-400 tracking-wider font-medium rounded">sneak peek</span>}
                          {p.status === "inactive" && <span className="tabular-nums text-[9px] uppercase px-1.5 py-px border border-accent/20 bg-accent/5 text-accent/60 tracking-wider font-medium rounded">inactive</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[12px] text-accent/60 whitespace-nowrap">{p.sku ?? <span className="text-accent/40">—</span>}</td>
                      <td className="px-3 py-3">
                        <span className={`tabular-nums text-[12px] font-bold ${p.stock === 0 ? "text-red-400" : p.stock <= 5 ? "text-yellow-400" : "text-green-400"}`}>{p.stock}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {p.sale_price ? (
                          <div className="flex flex-col leading-tight">
                            <span className="tabular-nums text-[12px] font-bold text-primary">₱{p.sale_price.toLocaleString()}</span>
                            <span className="tabular-nums text-[10px] text-accent/60 line-through">₱{p.price.toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="tabular-nums text-[12px] text-fg">₱{p.price.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[12px] text-accent/60 whitespace-nowrap">{p.cost > 0 ? `₱${p.cost.toLocaleString()}` : <span className="text-accent/40">—</span>}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {p.cost > 0 ? (
                          <span className={`tabular-nums text-[12px] font-bold ${profit(p) >= 0 ? "text-green-400" : "text-primary"}`}>₱{profit(p).toLocaleString()}</span>
                        ) : (
                          <span className="tabular-nums text-[12px] text-accent/40">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[12px] text-accent/60 max-w-[120px] truncate">{p.brand_id && brandMap[p.brand_id] ? brandMap[p.brand_id] : <span className="text-accent/40">—</span>}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setQuickEdit(p)} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-primary hover:text-primary transition-colors" title="Quick edit">
                            <span className="material-symbols-outlined text-[13px]">bolt</span>
                          </button>
                          <Link href={`/admin/products/${p.id}`} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-primary hover:text-primary transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                          </Link>
                          <button onClick={() => handleDuplicate(p)} disabled={duplicating === p.id} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-primary hover:text-primary transition-colors disabled:opacity-40" title="Duplicate">
                            <span className="material-symbols-outlined text-[13px]">{duplicating === p.id ? "progress_activity" : "content_copy"}</span>
                          </button>
                          <button onClick={() => toggleStatus(p)} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-blue-400 hover:text-blue-400 transition-colors" title={p.status === "active" ? "Disable" : "Enable"}>
                            <span className="material-symbols-outlined text-[13px]">{p.status === "active" ? "visibility_off" : "visibility"}</span>
                          </button>
                          <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-40" title="Delete">
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {quickEdit && (
        <QuickEditModal
          key={quickEdit.id}
          product={quickEdit}
          onClose={() => setQuickEdit(null)}
          onSaved={(updated) => {
            setProducts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            setQuickEdit(null);
          }}
        />
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2 tabular-nums text-[12px] text-accent/60 py-10">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading products…
      </div>
    }>
      <AdminProductsPageInner />
    </Suspense>
  );
}
