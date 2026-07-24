"use client";

import { Fragment, useEffect, useRef, useState } from "react";

type LedgerEntry = {
  id: string;
  title: string;
  source: string;
  type: "incoming" | "outgoing";
  amount: number;
  entry_date: string;
};

type FormState = {
  title: string;
  source: string;
  type: "incoming" | "outgoing";
  amount: string;
  entry_date: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const now = new Date();

const INPUT = "w-full bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20";
const LABEL = "block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5";
const SELECT = "w-full bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors";

// Returns current time in Asia/Manila as a datetime-local string (YYYY-MM-DDTHH:mm)
function nowPH(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16);
}

// Converts a UTC ISO string to a datetime-local string in PH time
function toPHLocal(iso: string): string {
  return new Date(new Date(iso).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16);
}

function emptyForm(): FormState {
  return {
    title: "",
    source: "",
    type: "incoming",
    amount: "",
    entry_date: nowPH(),
  };
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()));
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/ledger")
      .then(r => r.json())
      .then(data => { setEntries(Array.isArray(data) ? data : []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  // Filtered entries
  const filtered = entries.filter(e => {
    const d = new Date(e.entry_date);
    const monthMatch = filterMonth === "all" || d.getMonth() + 1 === Number(filterMonth);
    const yearMatch = filterYear === "" || d.getFullYear() === Number(filterYear);
    const typeMatch = filterType === "all" || e.type === filterType;
    const sourceMatch = filterSource === "all" || e.source === filterSource;
    return monthMatch && yearMatch && typeMatch && sourceMatch;
  });

  const sources = Array.from(new Set(entries.map(e => e.source).filter(Boolean))).sort();

  const totalIncoming = filtered.filter(e => e.type === "incoming").reduce((s, e) => s + e.amount, 0);
  const totalOutgoing = filtered.filter(e => e.type === "outgoing").reduce((s, e) => s + e.amount, 0);
  const balance = totalIncoming - totalOutgoing;

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (entry: LedgerEntry) => {
    setEditing(entry);
    setForm({
      title: entry.title,
      source: entry.source,
      type: entry.type,
      amount: String(entry.amount),
      entry_date: toPHLocal(entry.entry_date),
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const set$ = (key: keyof FormState, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    if (!form.amount || isNaN(Number(form.amount))) { setFormError("Enter a valid amount."); return; }
    setSaving(true);
    setFormError("");
    const payload = {
      title: form.title.trim(),
      source: form.source.trim(),
      type: form.type,
      amount: Number(form.amount),
      entry_date: form.entry_date ? new Date(form.entry_date + ":00+08:00").toISOString() : new Date().toISOString(),
    };
    const res = await fetch(
      editing ? `/api/admin/ledger/${editing.id}` : "/api/admin/ledger",
      { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    const json = await res.json();
    if (!res.ok) { setFormError(json.error ?? "Failed to save."); setSaving(false); return; }
    setSaving(false);
    closeModal();
    load();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/admin/ledger/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmId(null);
    load();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
    });

  const years = Array.from(
    new Set(entries.map(e => new Date(e.entry_date).getFullYear()))
  ).sort((a, b) => b - a);
  if (!years.includes(now.getFullYear())) years.unshift(now.getFullYear());

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-1">ADMIN // LEDGER</p>
          <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">Ledger</h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/20 transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add Entry
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-green-400/70 uppercase tracking-widest mb-2">
            <span className="material-symbols-outlined text-[13px]">arrow_downward</span>
            Total Incoming
          </div>
          <p className="font-inter font-black text-[26px] text-green-400">₱{totalIncoming.toLocaleString("en-US")}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-red-400/70 uppercase tracking-widest mb-2">
            <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
            Total Outgoing
          </div>
          <p className="font-inter font-black text-[26px] text-red-400">₱{totalOutgoing.toLocaleString("en-US")}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#ebbbb4]/50 uppercase tracking-widest mb-2">
            <span className="material-symbols-outlined text-[13px]">account_balance</span>
            Balance
          </div>
          <p className={`font-inter font-black text-[26px] ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
            {balance < 0 ? "−" : ""}₱{Math.abs(balance).toLocaleString("en-US")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="bg-[#1a1a1a] border border-[#603e39]/40 text-[#e2e2e2] font-mono text-[12px] px-4 py-2 focus:outline-none focus:border-primary transition-colors"
        >
          <option value="all">All Months</option>
          {MONTHS.map((m, i) => (
            <option key={i} value={String(i + 1)}>{m}</option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          className="bg-[#1a1a1a] border border-[#603e39]/40 text-[#e2e2e2] font-mono text-[12px] px-4 py-2 focus:outline-none focus:border-primary transition-colors"
        >
          <option value="">All Years</option>
          {years.map(y => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-[#1a1a1a] border border-[#603e39]/40 text-[#e2e2e2] font-mono text-[12px] px-4 py-2 focus:outline-none focus:border-primary transition-colors"
        >
          <option value="all">All Types</option>
          <option value="incoming">Incoming</option>
          <option value="outgoing">Outgoing</option>
        </select>
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className="bg-[#1a1a1a] border border-[#603e39]/40 text-[#e2e2e2] font-mono text-[12px] px-4 py-2 focus:outline-none focus:border-primary transition-colors"
        >
          <option value="all">All Source</option>
          {sources.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="font-mono text-[11px] text-[#ebbbb4]/30">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-8">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#603e39]/20 p-12 text-center">
          <span className="material-symbols-outlined text-[32px] text-[#ebbbb4]/20 block mb-3">account_balance_wallet</span>
          <p className="font-mono text-[12px] text-[#ebbbb4]/30">No entries for this period.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards (hidden on md+) ── */}
          <div className="md:hidden space-y-2">
            {filtered.map(entry => (
              <div key={entry.id} className="bg-[#1a1a1a] border border-[#603e39]/20">
                <div className="px-4 py-3 space-y-1">
                  {/* Row 1: title */}
                  <p className="font-inter font-semibold text-[13px] text-[#e2e2e2] truncate">{entry.title}</p>

                  {/* Row 2: source | date and time */}
                  <p className="font-mono text-[11px] text-[#ebbbb4]/40 flex items-center gap-1.5">
                    <span>{entry.source || "—"}</span>
                    <span className="text-[#603e39]/60">|</span>
                    <span>{formatDate(entry.entry_date)}</span>
                  </p>

                  {/* Row 3: type | amount | pencil | trash */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest border px-1.5 py-px ${
                      entry.type === "incoming"
                        ? "text-green-400 border-green-400/30 bg-green-400/10"
                        : "text-red-400 border-red-400/30 bg-red-400/10"
                    }`}>
                      <span className="material-symbols-outlined text-[10px]">
                        {entry.type === "incoming" ? "arrow_downward" : "arrow_upward"}
                      </span>
                      {entry.type}
                    </span>
                    <span className="text-[#603e39]/60 font-mono text-[11px]">|</span>
                    <span className={`font-mono font-bold text-[13px] ${entry.type === "incoming" ? "text-green-400" : "text-red-400"}`}>
                      {entry.type === "outgoing" ? "−" : "+"}₱{entry.amount.toLocaleString("en-US")}
                    </span>
                    <span className="flex-1" />
                    <button onClick={() => openEdit(entry)} className="text-[#ebbbb4]/30 hover:text-primary transition-colors" title="Edit">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => setConfirmId(confirmId === entry.id ? null : entry.id)} className="text-[#ebbbb4]/30 hover:text-red-400 transition-colors" title="Delete">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {confirmId === entry.id && (
                  <div className="border-t border-red-900/30 bg-[#1f1212] px-4 py-3">
                    <p className="font-mono text-[11px] text-red-300 mb-2">
                      Delete <span className="text-white">{entry.title}</span>? Cannot be undone.
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setConfirmId(null)} className="font-mono text-[11px] text-[#ebbbb4]/50 hover:text-[#e2e2e2] transition-colors">Cancel</button>
                      <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id} className="flex items-center gap-1.5 px-3 py-1 bg-red-600/20 border border-red-600/50 text-red-400 font-mono text-[11px] uppercase tracking-widest hover:bg-red-600/30 transition-colors disabled:opacity-50">
                        {deletingId === entry.id ? <span className="material-symbols-outlined animate-spin text-[13px]">progress_activity</span> : <span className="material-symbols-outlined text-[13px]">delete</span>}
                        {deletingId === entry.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Desktop table (hidden below md) ── */}
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#603e39]/40">
                {["Title", "Source", "Type", "Amount", "Date", ""].map((h, i) => (
                  <th key={i} className={`text-left font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/40 px-3 py-3 whitespace-nowrap ${i >= 3 ? "text-right" : "text-left"} ${i === 0 ? "w-[240px]" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <Fragment key={entry.id}>
                  <tr className="border-b border-[#603e39]/15 hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-3 py-3 font-inter font-semibold text-[13px] text-[#e2e2e2] max-w-[240px] truncate" title={entry.title}>
                      {entry.title}
                    </td>
                    <td className="px-3 py-3 font-mono text-[12px] text-[#ebbbb4]/60 whitespace-nowrap">
                      {entry.source || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 ${
                        entry.type === "incoming"
                          ? "text-green-400 border-green-400/30 bg-green-400/10"
                          : "text-red-400 border-red-400/30 bg-red-400/10"
                      }`}>
                        <span className="material-symbols-outlined text-[11px]">
                          {entry.type === "incoming" ? "arrow_downward" : "arrow_upward"}
                        </span>
                        {entry.type}
                      </span>
                    </td>
                    <td className={`px-3 py-3 font-mono font-bold text-[13px] text-right whitespace-nowrap ${
                      entry.type === "incoming" ? "text-green-400" : "text-red-400"
                    }`}>
                      {entry.type === "outgoing" ? "−" : "+"}₱{entry.amount.toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-[#ebbbb4]/40 text-right whitespace-nowrap">
                      {formatDate(entry.entry_date)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(entry)}
                          className="p-1.5 text-[#ebbbb4]/30 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => setConfirmId(confirmId === entry.id ? null : entry.id)}
                          className="p-1.5 text-[#ebbbb4]/30 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {confirmId === entry.id && (
                    <tr className="border-b border-[#603e39]/15 bg-[#1f1212]">
                      <td colSpan={6} className="px-5 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-mono text-[11px] text-red-300">
                            Delete <span className="text-white">{entry.title}</span>? This cannot be undone.
                          </p>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <button onClick={() => setConfirmId(null)} className="font-mono text-[11px] text-[#ebbbb4]/50 hover:text-[#e2e2e2] transition-colors">
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={deletingId === entry.id}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600/20 border border-red-600/50 text-red-400 font-mono text-[11px] uppercase tracking-widest hover:bg-red-600/30 transition-colors disabled:opacity-50"
                            >
                              {deletingId === entry.id
                                ? <span className="material-symbols-outlined animate-spin text-[13px]">progress_activity</span>
                                : <span className="material-symbols-outlined text-[13px]">delete</span>
                              }
                              {deletingId === entry.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div
            ref={modalRef}
            className="w-full max-w-md bg-[#131313] border border-[#603e39]/60 shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#603e39]/30">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
                  {editing ? "Edit Entry" : "New Entry"}
                </p>
                <h2 className="font-inter font-black text-[18px] uppercase text-[#e2e2e2]">
                  {editing ? editing.title : "Add Ledger Entry"}
                </h2>
              </div>
              <button onClick={closeModal} className="text-[#ebbbb4]/30 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={LABEL}>Title <span className="text-primary">*</span></label>
                <input
                  value={form.title}
                  onChange={e => set$("title", e.target.value)}
                  placeholder="e.g. Product Sale, Shipping Fee"
                  className={INPUT}
                  autoFocus
                />
              </div>
              <div>
                <label className={LABEL}>Source</label>
                <input
                  value={form.source}
                  onChange={e => set$("source", e.target.value)}
                  placeholder="e.g. GCash, Bank, Customer name"
                  className={INPUT}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Type <span className="text-primary">*</span></label>
                  <select value={form.type} onChange={e => set$("type", e.target.value as "incoming" | "outgoing")} className={SELECT}>
                    <option value="incoming">Incoming</option>
                    <option value="outgoing">Outgoing</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Amount (₱) <span className="text-primary">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => set$("amount", e.target.value)}
                    placeholder="0.00"
                    className={INPUT}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL}>Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={form.entry_date ?? ""}
                  onChange={e => set$("entry_date", e.target.value)}
                  className={INPUT}
                />
              </div>

              {formError && (
                <p className="font-mono text-[11px] text-red-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">error</span>
                  {formError}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-[#603e39]/30 flex items-center justify-end gap-3">
              <button onClick={closeModal} className="font-mono text-[11px] text-[#ebbbb4]/50 hover:text-[#e2e2e2] transition-colors px-4 py-2">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {saving
                  ? <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                  : <span className="material-symbols-outlined text-[14px]">save</span>
                }
                {saving ? "Saving…" : editing ? "Update" : "Add Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
