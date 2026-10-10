"use client";

import { useEffect, useState } from "react";
import type { Taxonomy, TaxonomyType } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toSlug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const TABS: { type: TaxonomyType; label: string; icon: string }[] = [
  { type: "brand", label: "Brands", icon: "storefront" },
  { type: "category", label: "Categories", icon: "category" },
  { type: "tag", label: "Tags", icon: "label" },
];

const EMPTY_FORM = { name: "", slug: "", description: "" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTaxonomyPage() {
  const [activeType, setActiveType] = useState<TaxonomyType>("brand");
  const [items, setItems] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"new" | Taxonomy | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const fetch$ = async (type: TaxonomyType) => {
    setLoading(true);
    const res = await fetch(`/api/admin/taxonomy?type=${type}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetch$(activeType); }, [activeType]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setFormError("");
    setModal("new");
  };

  const openEdit = (item: Taxonomy) => {
    setForm({ name: item.name, slug: item.slug, description: item.description ?? "" });
    setSlugTouched(true);
    setFormError("");
    setModal(item);
  };

  const closeModal = () => setModal(null);

  const setName = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : toSlug(name),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.slug.trim()) { setFormError("Slug is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const isEdit = modal !== "new" && modal !== null;
      const url = isEdit ? `/api/admin/taxonomy/${(modal as Taxonomy).id}` : "/api/admin/taxonomy";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? form
            : { ...form, type: activeType }
        ),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save.");
      }
      await fetch$(activeType);
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/taxonomy/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((x) => x.id !== id));
    setDeleting(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila",
    });

  const activeTab = TABS.find((t) => t.type === activeType)!;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-semibold text-fg text-[22px] tracking-tight">
            Taxonomy
          </h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white tabular-nums text-[11px] hover:bg-primary/90 transition-all font-medium shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add {activeTab.label.replace(/s$/, "")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-line/30">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveType(tab.type)}
            className={`flex items-center gap-1.5 px-4 py-2.5 tabular-nums text-[11px] transition-colors border-b-2 -mb-px font-medium rounded-none ${
              activeType === tab.type
                ? "text-primary border-primary"
                : "text-accent/60 border-transparent hover:text-fg"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
            {tab.label}
            {!loading && (
              <span className="ml-1 tabular-nums text-[10px] text-accent/50">
                {activeType === tab.type ? items.length : ""}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 tabular-nums text-[12px] text-accent/60 py-10">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 tabular-nums text-[12px] text-accent/50">
          No {activeTab.label.toLowerCase()} yet. Add one above.
        </div>
      ) : (
        <>
          {/* ── Mobile cards (hidden on md+) ── */}
          <div className="md:hidden space-y-2">
            {items.map((item) => (
              <div key={item.id} className="bg-panel border border-line/20 px-4 py-3 space-y-1 rounded-lg">
                {/* Row 1: name */}
                <p className="font-bold text-[13px] text-fg">{item.name}</p>

                {/* Row 2: slug | date */}
                <p className="tabular-nums text-[11px] text-accent/60 flex items-center gap-1.5">
                  <span className="truncate">{item.slug}</span>
                  <span className="text-line/60 flex-shrink-0">|</span>
                  <span className="flex-shrink-0">{formatDate(item.created_at)}</span>
                </p>

                {/* Row 3: description | pencil | trash */}
                <div className="flex items-center gap-2">
                  <p className="tabular-nums text-[11px] text-accent/50 flex-1 truncate">
                    {item.description || "—"}
                  </p>
                  <button onClick={() => openEdit(item)} className="text-accent/50 hover:text-primary transition-colors flex-shrink-0" title="Edit">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="text-accent/50 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-40" title="Delete">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table (hidden below md) ── */}
          <table className="hidden md:table w-full border-collapse">
            <thead>
              <tr className="border-b border-line/40">
                {["Name", "Slug", "Description", "Date", ""].map((h) => (
                  <th key={h} className="text-left tabular-nums text-[10px] uppercase text-accent/60 px-3 py-3 tracking-wider font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-line/15 hover:bg-panel transition-colors">
                  <td className="px-3 py-3 font-bold text-[13px] text-fg">{item.name}</td>
                  <td className="px-3 py-3 tabular-nums text-[12px] text-accent/70">{item.slug}</td>
                  <td className="px-3 py-3 tabular-nums text-[12px] text-accent/60 max-w-[240px] truncate">{item.description ?? <span className="text-accent/40">—</span>}</td>
                  <td className="px-3 py-3 tabular-nums text-[11px] text-accent/50 whitespace-nowrap">{formatDate(item.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(item)} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-primary hover:text-primary transition-colors" title="Edit">
                        <span className="material-symbols-outlined text-[13px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="w-7 h-7 flex items-center justify-center border border-line/40 text-accent/70 hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-40" title="Delete">
                        <span className="material-symbols-outlined text-[13px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Modal */}
      {modal !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/85 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md bg-canvas border border-line/50 rounded-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line/30">
              <div>
                <p className="tabular-nums text-[10px] text-primary uppercase mb-0.5 tracking-wider font-medium">
                  {activeTab.label}
                </p>
                <h2 className="font-bold text-[17px] text-fg font-medium">
                  {modal === "new" ? `Add ${activeTab.label.replace(/s$/, "")}` : "Edit Entry"}
                </h2>
              </div>
              <button onClick={closeModal} className="text-accent/60 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block tabular-nums text-[10px] uppercase text-accent/60 mb-1.5 tracking-wider font-medium">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`e.g. ${activeType === "brand" ? "Takara Tomy" : activeType === "category" ? "Burst Series" : "limited"}`}
                  className="w-full bg-fg/[0.05] border border-line text-fg tabular-nums text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-accent/40 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block tabular-nums text-[10px] uppercase text-accent/60 mb-1.5 tracking-wider font-medium">
                  Slug <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((prev) => ({ ...prev, slug: toSlug(e.target.value) }));
                  }}
                  placeholder="auto-generated from name"
                  className="w-full bg-fg/[0.05] border border-line text-fg tabular-nums text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-accent/40 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block tabular-nums text-[10px] uppercase text-accent/60 mb-1.5 tracking-wider font-medium">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Optional description…"
                  className="w-full bg-fg/[0.05] border border-line text-fg tabular-nums text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-accent/40 resize-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {formError && (
                <p className="flex items-center gap-1.5 tabular-nums text-[12px] text-red-400">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {formError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-line/30">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 border border-line/50 text-accent/70 tabular-nums text-[11px] hover:border-accent/40 hover:text-accent transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-primary text-white tabular-nums text-[11px] hover:bg-primary/90 transition-all disabled:opacity-50 font-medium shadow-sm"
              >
                {saving ? "Saving…" : modal === "new" ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
