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
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-1 uppercase">
            ADMIN // TAXONOMY
          </p>
          <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">
            Taxonomy
          </h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-mono text-[11px] tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add {activeTab.label.replace(/s$/, "")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#603e39]/30">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveType(tab.type)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-mono text-[11px] tracking-widest uppercase transition-colors border-b-2 -mb-px ${
              activeType === tab.type
                ? "text-primary border-primary"
                : "text-[#ebbbb4]/40 border-transparent hover:text-[#e2e2e2]"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
            {tab.label}
            {!loading && (
              <span className="ml-1 font-mono text-[10px] text-[#ebbbb4]/30">
                {activeType === tab.type ? items.length : ""}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-10">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 font-mono text-[12px] text-[#ebbbb4]/30">
          No {activeTab.label.toLowerCase()} yet. Add one above.
        </div>
      ) : (
        <>
          {/* ── Mobile cards (hidden on md+) ── */}
          <div className="md:hidden space-y-2">
            {items.map((item) => (
              <div key={item.id} className="bg-[#1a1a1a] border border-[#603e39]/20 px-4 py-3 space-y-1">
                {/* Row 1: name */}
                <p className="font-inter font-bold text-[13px] text-[#e2e2e2]">{item.name}</p>

                {/* Row 2: slug | date */}
                <p className="font-mono text-[11px] text-[#ebbbb4]/40 flex items-center gap-1.5">
                  <span className="truncate">{item.slug}</span>
                  <span className="text-[#603e39]/60 flex-shrink-0">|</span>
                  <span className="flex-shrink-0">{formatDate(item.created_at)}</span>
                </p>

                {/* Row 3: description | pencil | trash */}
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[11px] text-[#ebbbb4]/30 flex-1 truncate">
                    {item.description || "—"}
                  </p>
                  <button onClick={() => openEdit(item)} className="text-[#ebbbb4]/30 hover:text-primary transition-colors flex-shrink-0" title="Edit">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="text-[#ebbbb4]/30 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-40" title="Delete">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table (hidden below md) ── */}
          <table className="hidden md:table w-full border-collapse">
            <thead>
              <tr className="border-b border-[#603e39]/40">
                {["Name", "Slug", "Description", "Date", ""].map((h) => (
                  <th key={h} className="text-left font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/40 px-3 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[#603e39]/15 hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-3 py-3 font-inter font-bold text-[13px] text-[#e2e2e2]">{item.name}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-[#ebbbb4]/50">{item.slug}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-[#ebbbb4]/40 max-w-[240px] truncate">{item.description ?? <span className="text-[#ebbbb4]/20">—</span>}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-[#ebbbb4]/30 whitespace-nowrap">{formatDate(item.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(item)} className="w-7 h-7 flex items-center justify-center border border-[#603e39]/40 text-[#ebbbb4]/50 hover:border-primary hover:text-primary transition-colors" title="Edit">
                        <span className="material-symbols-outlined text-[13px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="w-7 h-7 flex items-center justify-center border border-[#603e39]/40 text-[#ebbbb4]/50 hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-40" title="Delete">
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
          <div className="w-full max-w-md bg-[#131313] border border-[#603e39]/50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#603e39]/30">
              <div>
                <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-0.5">
                  {activeTab.label}
                </p>
                <h2 className="font-inter font-bold text-[17px] uppercase text-[#e2e2e2]">
                  {modal === "new" ? `Add ${activeTab.label.replace(/s$/, "")}` : "Edit Entry"}
                </h2>
              </div>
              <button onClick={closeModal} className="text-[#ebbbb4]/40 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                  Name <span className="text-primary">*</span>
                </label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`e.g. ${activeType === "brand" ? "Takara Tomy" : activeType === "category" ? "Burst Series" : "limited"}`}
                  className="w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                  Slug <span className="text-primary">*</span>
                </label>
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((prev) => ({ ...prev, slug: toSlug(e.target.value) }));
                  }}
                  placeholder="auto-generated from name"
                  className="w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Optional description…"
                  className="w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20 resize-none"
                />
              </div>

              {formError && (
                <p className="flex items-center gap-1.5 font-mono text-[12px] text-primary">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {formError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-[#603e39]/30">
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
                {saving ? "Saving…" : modal === "new" ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
