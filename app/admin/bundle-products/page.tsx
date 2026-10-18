"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ResolvedBundle } from "@/lib/bundle-types";
import { BUNDLE_BLOCKED_REASON, blocksBundle, percentOff } from "@/lib/bundle-types";
import { reorderVisible } from "@/lib/reorder";
import { sizedImageUrl } from "@/lib/image-sizes";
import { TogglePill } from "../products/_form";

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

const isBlocked = (b: ResolvedBundle) => b.components.some(blocksBundle);

const stockClass =(n: number) => (n === 0 ? "text-red-400" : n <= 5 ? "text-yellow-400" : "text-green-400");

function BundleThumb({ b, size }: { b: ResolvedBundle; size: number }) {
  const src = b.image || b.components[0]?.image || null;
  return (
    <div className="relative flex-shrink-0 bg-deep border border-line/20 overflow-hidden rounded-md" style={{ width: size, height: size }}>
      {src ? (
        <Image
          src={sizedImageUrl(src, "small") ?? src}
          alt={b.name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={(e) => { if (e.currentTarget.src !== src) e.currentTarget.src = src; }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="material-symbols-outlined text-[16px] text-accent/40">package_2</span>
        </div>
      )}
    </div>
  );
}

// ── Quick edit ────────────────────────────────────────────────────────────────
function QuickEditModal({
  bundle,
  onClose,
  onSaved,
}: {
  bundle: ResolvedBundle;
  onClose: () => void;
  onSaved: (b: ResolvedBundle) => void;
}) {
  const [name, setName] = useState(bundle.name);
  const [price, setPrice] = useState(String(bundle.price));
  const [active, setActive] = useState(bundle.status === "active");
  const blocked = isBlocked(bundle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const priceNum = Number(price);
  const invalid = name.trim() === "" || price.trim() === "" || !Number.isFinite(priceNum) || priceNum < 0;
  const discount = bundle.regular_total - (Number.isFinite(priceNum) ? priceNum : 0);

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/bundles/${bundle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), price: priceNum, status: active && !blocked ? "active" : "inactive" }),
    });
    if (res.ok) { onSaved(await res.json()); return; }
    const body = await res.json().catch(() => ({}));
    setError(body.error ?? "Failed to save changes.");
    setSaving(false);
  };

  const label = "block tabular-nums text-[10px] uppercase text-accent/60 mb-1 tracking-wider font-medium";
  const field = "w-full bg-deep border border-line/40 text-fg tabular-nums text-[12px] px-3 py-2 focus:outline-none focus:border-primary transition-colors rounded-md focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-panel border border-line/40 rounded-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line/30 px-5 py-3">
          <div>
            <p className="tabular-nums text-[13px] font-semibold text-fg">Quick Edit</p>
            <p className="tabular-nums text-[11px] text-accent/60">{bundle.components.length} products · Regular {peso(bundle.regular_total)}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-accent/60 hover:text-primary transition-colors" title="Close">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-4">
            <BundleThumb b={bundle} size={96} />
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <label className={label} htmlFor="qe-name">Bundle Name</label>
                <input id="qe-name" value={name} onChange={(e) => setName(e.target.value)} className={field} autoFocus />
              </div>
              <div>
                <label className={label} htmlFor="qe-price">Bundle Price</label>
                <input id="qe-price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
                <p className={`tabular-nums text-[10px] mt-1 ${discount >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {discount >= 0 ? `${peso(discount)} off` : `${peso(-discount)} above regular total`}
                </p>
              </div>
            </div>
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

          {error && <p className="tabular-nums text-[11px] text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line/30 px-5 py-3">
          <button onClick={onClose} className="px-4 py-2 tabular-nums text-[11px] text-accent/60 hover:text-fg transition-colors font-medium">Cancel</button>
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

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<ResolvedBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [quickEdit, setQuickEdit] = useState<ResolvedBundle | null>(null);
  // Drag-and-drop reorder. The ref is what the drag handlers read (always current);
  // the state only drives the visuals.
  const dragIdRef = useRef<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/bundles")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load bundles.");
        setBundles(data);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load bundles."))
      .finally(() => setLoading(false));
  }, []);

  const replace = (b: ResolvedBundle) => setBundles((prev) => prev.map((x) => (x.id === b.id ? b : x)));

  const handleDelete = async (b: ResolvedBundle) => {
    if (!confirm(`Delete "${b.name}"? This cannot be undone.`)) return;
    setDeleting(b.id);
    const res = await fetch(`/api/admin/bundles/${b.id}`, { method: "DELETE" });
    if (res.ok) setBundles((prev) => prev.filter((x) => x.id !== b.id));
    setDeleting(null);
  };

  const toggleStatus = async (b: ResolvedBundle) => {
    const res = await fetch(`/api/admin/bundles/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: b.status === "active" ? "inactive" : "active" }),
    });
    if (res.ok) replace(await res.json());
  };

  // ── Reorder (drag & drop) ────────────────────────────────────────────────────
  const canReorder = !savingOrder;

  const endDrag = () => {
    dragIdRef.current = null;
    setDragId(null);
    setOverId(null);
  };

  const reorder = async (fromId: string, toId: string) => {
    const result = reorderVisible(bundles, bundles, fromId, toId);
    if (!result) return;
    const previous = bundles;
    setBundles(result.next);
    setSavingOrder(true);
    setReorderError(null);
    try {
      const res = await fetch("/api/admin/bundles/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: result.changed }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setBundles(previous);
      setReorderError("Couldn't save the new order — it was put back.");
      setTimeout(() => setReorderError(null), 5000);
    } finally {
      setSavingOrder(false);
    }
  };

  const dropTarget = (id: string) => {
    let indicator = "";
    if (dragId && overId === id && dragId !== id) {
      const from = bundles.findIndex((b) => b.id === dragId);
      const to = bundles.findIndex((b) => b.id === id);
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
        if (fromId) reorder(fromId, id);
      },
      indicator,
      dragging: dragId === id,
    };
  };

  // A plain function (not a component) on purpose: remounting the handle mid-drag cancels the drag.
  const renderHandle = (b: ResolvedBundle) => (
    <span
      draggable={canReorder}
      onDragStart={(e) => {
        if (!canReorder) return;
        const row = e.currentTarget.closest("[data-bundle-row]");
        if (row) e.dataTransfer.setDragImage(row, 16, 16);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", b.id);
        dragIdRef.current = b.id;
        // Defer the visual change: restyling the row inside dragstart can cancel the drag.
        setTimeout(() => setDragId(b.id), 0);
      }}
      onDragEnd={endDrag}
      title="Drag to reorder"
      className={`w-7 h-7 flex items-center justify-center flex-shrink-0 select-none transition-colors ${
        canReorder ? "cursor-move text-accent/60 hover:text-primary" : "cursor-not-allowed text-accent/15"
      }`}
    >
      <span className="material-symbols-outlined text-[18px] pointer-events-none">open_with</span>
    </span>
  );

  // Full class names written out so Tailwind picks them up.
  const indicatorClass = (indicator: string, tableRow = false) =>
    indicator === "above"
      ? tableRow ? "[&>td]:shadow-[inset_0_2px_0_0_rgb(var(--c-primary))]" : "shadow-[inset_0_2px_0_0_rgb(var(--c-primary))]"
      : indicator === "below"
      ? tableRow ? "[&>td]:shadow-[inset_0_-2px_0_0_rgb(var(--c-primary))]" : "shadow-[inset_0_-2px_0_0_rgb(var(--c-primary))]"
      : "";

  const badges = (b: ResolvedBundle) => (
    <>
      {b.status === "inactive" && (
        <span className="tabular-nums text-[9px] uppercase px-1.5 py-px border border-accent/20 bg-accent/5 text-accent/60 tracking-wider font-medium rounded">inactive</span>
      )}
      {isBlocked(b) ? (
        <span className="tabular-nums text-[9px] uppercase px-1.5 py-px border border-orange-400/30 bg-orange-400/10 text-orange-400 tracking-wider font-medium rounded" title={BUNDLE_BLOCKED_REASON}>
          {b.components.some((c) => c.pre_order) ? "has pre-order" : "has sneak peek"}
        </span>
      ) : !b.available && (
        <span className="tabular-nums text-[9px] uppercase px-1.5 py-px border border-red-400/30 bg-red-400/10 text-red-400 tracking-wider font-medium rounded" title="A product in this bundle is inactive or deleted">
          unavailable
        </span>
      )}
    </>
  );

  const priceCell = (b: ResolvedBundle) => (
    <div className="flex flex-col leading-tight">
      <span className="tabular-nums text-[12px] font-bold text-primary">{peso(b.price)}</span>
      <span className="tabular-nums text-[10px] text-accent/60">
        <span className="line-through">{peso(b.regular_total)}</span>
        {b.discount > 0 && <span className="text-green-400 ml-1">−{percentOff(b)}%</span>}
      </span>
    </div>
  );

  const actions = (b: ResolvedBundle) => (
    <div className="flex items-center gap-1.5">
      <button onClick={() => setQuickEdit(b)} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-primary hover:text-primary transition-colors" title="Quick edit">
        <span className="material-symbols-outlined text-[13px]">bolt</span>
      </button>
      <Link href={`/admin/bundle-products/${b.id}`} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-primary hover:text-primary transition-colors" title="Edit">
        <span className="material-symbols-outlined text-[13px]">edit</span>
      </Link>
      <button
        onClick={() => toggleStatus(b)}
        disabled={b.status !== "active" && isBlocked(b)}
        className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-blue-400 hover:text-blue-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-line/40 disabled:hover:text-accent/70"
        title={b.status !== "active" && isBlocked(b) ? BUNDLE_BLOCKED_REASON : b.status === "active" ? "Disable" : "Enable"}
      >
        <span className="material-symbols-outlined text-[13px]">{b.status === "active" ? "visibility_off" : "visibility"}</span>
      </button>
      <button onClick={() => handleDelete(b)} disabled={deleting === b.id} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-40" title="Delete">
        <span className="material-symbols-outlined text-[13px]">delete</span>
      </button>
    </div>
  );

  const thBase = "text-left tabular-nums text-[10px] uppercase text-accent/60 px-3 py-3 whitespace-nowrap tracking-wider font-medium";

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="font-semibold text-fg text-[22px] tracking-tight">Bundle Products</h1>
        <Link
          href="/admin/bundle-products/new"
          className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Bundle
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {reorderError && <span className="tabular-nums text-[10px] text-red-400">{reorderError}</span>}
        <span className="ml-auto tabular-nums text-[10px] text-accent/50">{bundles.length} bundles</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 tabular-nums text-[12px] text-accent/60 py-10">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading bundles…
        </div>
      ) : loadError ? (
        <div className="text-center py-12 tabular-nums text-[12px] text-red-400">
          {loadError}
          <p className="text-accent/50 mt-1">If the bundles table doesn&apos;t exist yet, run the &quot;Bundle products&quot; SQL from supabase/schema.sql.</p>
        </div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-12 tabular-nums text-[12px] text-accent/50">No bundles yet.</div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-2">
            {bundles.map((b) => {
              const drop = dropTarget(b.id);
              return (
                <div
                  key={b.id}
                  data-bundle-row
                  onDragOver={drop.onDragOver}
                  onDrop={drop.onDrop}
                  className={`flex gap-2 bg-panel border border-line/30 p-3 rounded-lg ${b.status === "inactive" ? "opacity-40" : ""} ${drop.dragging ? "!opacity-30" : ""} ${indicatorClass(drop.indicator)}`}
                >
                  <div className="flex items-center -ml-1">{renderHandle(b)}</div>
                  <BundleThumb b={b} size={64} />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className="font-bold text-[13px] text-fg leading-tight truncate">{b.name}</p>
                      {badges(b)}
                    </div>
                    <p className="tabular-nums text-[11px] text-accent/70">
                      {b.components.length} products
                      <span className="mx-1.5 text-line/60">|</span>
                      Stocks: <span className={`font-bold ${stockClass(b.stock)}`}>{b.stock}</span>
                    </p>
                    {priceCell(b)}
                    <div className="pt-0.5">{actions(b)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-line/40">
                  <th className={`${thBase} w-8 px-1`}></th>
                  <th className={thBase}>Image</th>
                  <th className={thBase}>Name</th>
                  <th className={thBase}>Products</th>
                  <th className={thBase}>Stock</th>
                  <th className={thBase}>Price</th>
                  <th className={thBase}></th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((b) => {
                  const drop = dropTarget(b.id);
                  return (
                    <tr
                      key={b.id}
                      data-bundle-row
                      onDragOver={drop.onDragOver}
                      onDrop={drop.onDrop}
                      className={`border-b border-line/15 hover:bg-panel transition-colors ${b.status === "inactive" ? "opacity-40" : ""} ${drop.dragging ? "!opacity-30" : ""} ${indicatorClass(drop.indicator, true)}`}
                    >
                      <td className="pl-2 pr-0 py-3 w-8">{renderHandle(b)}</td>
                      <td className="px-3 py-3"><BundleThumb b={b} size={40} /></td>
                      <td className="px-3 py-3">
                        <p className="font-bold text-[13px] text-fg leading-tight max-w-[220px] truncate">{b.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">{badges(b)}</div>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[11px] text-accent/70 max-w-[320px]">
                        {b.components.map((c) => (
                          <p key={c.product_id} className={`truncate ${c.available ? "" : "text-red-400"}`}>
                            {c.qty}× {c.name}
                            <span className={`ml-1 ${stockClass(c.stock)}`}>({c.stock})</span>
                          </p>
                        ))}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`tabular-nums text-[12px] font-bold ${stockClass(b.stock)}`}>{b.stock}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{priceCell(b)}</td>
                      <td className="px-3 py-3">{actions(b)}</td>
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
          bundle={quickEdit}
          onClose={() => setQuickEdit(null)}
          onSaved={(updated) => { replace(updated); setQuickEdit(null); }}
        />
      )}
    </div>
  );
}
