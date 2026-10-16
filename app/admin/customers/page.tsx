"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  auth_provider: string;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  twitter_url: string | null;
  billing_phone: string;
  billing_city: string;
  billing_state: string;
  is_blocked: boolean;
  block_reason: string | null;
  created_at: string;
};

const PROVIDER_COLORS: Record<string, string> = {
  email: "text-accent/70 border-line/50",
  google: "text-blue-400 border-blue-400/40",
  facebook: "text-blue-500 border-blue-500/40",
};

const SOCIALS: { key: keyof Customer; icon: string; title: string }[] = [
  { key: "facebook_url", icon: "group", title: "Facebook" },
  { key: "instagram_url", icon: "photo_camera", title: "Instagram" },
  { key: "tiktok_url", icon: "music_video", title: "TikTok" },
  { key: "twitter_url", icon: "alternate_email", title: "X / Twitter" },
];

function initials(c: Customer) {
  return `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase() || c.email[0].toUpperCase();
}

function SocialIcons({ c }: { c: Customer }) {
  const links = SOCIALS.filter((s) => c[s.key]);
  if (links.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {links.map((s) => (
        <a
          key={s.key}
          href={c[s.key] as string}
          target="_blank"
          rel="noopener noreferrer"
          title={s.title}
          onClick={(e) => e.stopPropagation()}
          className="text-accent/60 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined !text-[14px]">{s.icon}</span>
        </a>
      ))}
    </span>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [blockingId, setBlockingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/customers")
      .then(r => r.json())
      .then(data => { setCustomers(Array.isArray(data) ? data : []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.billing_city ?? "").toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmId(null);
    load();
  };

  const handleToggleBlock = async (c: Customer) => {
    setBlockingId(c.id);
    const res = await fetch(`/api/admin/customers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_blocked: !c.is_blocked }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCustomers(prev => prev.map(x => (x.id === c.id ? { ...x, ...updated } : x)));
    }
    setBlockingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-fg text-[22px] tracking-tight">Customers</h1>
        </div>
        <Link
          href="/admin/customers/new"
          className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[14px]">person_add</span>
          New Customer
        </Link>
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-panel border border-line/40 focus-within:border-primary px-4 py-2.5 transition-colors flex-1 max-w-xs rounded-lg">
          <span className="material-symbols-outlined text-accent/50 text-[16px]">search</span>
          <input
            type="text"
            placeholder="Search by name, email, or city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-fg tabular-nums text-[12px] focus:outline-none placeholder:text-accent/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-accent/50 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
        {!loading && (
          <span className="tabular-nums text-[11px] text-accent/50">
            {filtered.length} {filtered.length === 1 ? "customer" : "customers"}
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 tabular-nums text-[12px] text-accent/60 py-12">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-panel border border-line/20 p-12 text-center rounded-lg">
          <span className="material-symbols-outlined text-[32px] text-accent/40 block mb-3">group</span>
          <p className="tabular-nums text-[12px] text-accent/50">
            {search ? "No customers match your search." : "No customers yet."}
          </p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards (hidden on md+) ── */}
          <div className="md:hidden space-y-2">
            {filtered.map(c => (
              <div key={c.id} className="bg-panel border border-line/20 rounded-lg">
                <div className="flex gap-3 p-3">
                  {/* Initial circle */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="tabular-nums text-[11px] text-primary font-bold">{initials(c)}</span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Row 1: Name | provider */}
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[13px] text-fg truncate">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                      </p>
                      <SocialIcons c={c} />
                      {c.is_blocked && (
                        <span className="tabular-nums text-[9px] uppercase border border-red-500/40 bg-red-500/10 text-red-400 px-1.5 py-px flex-shrink-0 tracking-wider font-medium rounded">
                          blocked
                        </span>
                      )}
                      <span className={`tabular-nums text-[9px] uppercase border px-1.5 py-px flex-shrink-0 tracking-wider font-medium rounded ${PROVIDER_COLORS[c.auth_provider] ?? PROVIDER_COLORS.email}`}>
                        {c.auth_provider}
                      </span>
                    </div>

                    {/* Row 2: email | phone */}
                    <p className="tabular-nums text-[11px] text-accent/70 flex flex-wrap items-center gap-x-1.5">
                      <span className="truncate">{c.email}</span>
                      {c.billing_phone && (
                        <>
                          <span className="text-line/60">|</span>
                          <span className="flex-shrink-0">{c.billing_phone}</span>
                        </>
                      )}
                    </p>

                    {/* Row 3: location | pencil | trash */}
                    <div className="flex items-center gap-2">
                      <p className="tabular-nums text-[11px] text-accent/60 flex-1 truncate">
                        {[c.billing_city, c.billing_state].filter(Boolean).join(", ") || "—"}
                      </p>
                      <Link href={`/admin/customers/${c.id}`} className="text-accent/50 hover:text-primary transition-colors flex-shrink-0" title="Edit">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </Link>
                      <button
                        onClick={() => handleToggleBlock(c)}
                        disabled={blockingId === c.id}
                        className={`transition-colors flex-shrink-0 disabled:opacity-40 ${c.is_blocked ? "text-red-400 hover:text-green-400" : "text-accent/50 hover:text-red-400"}`}
                        title={c.is_blocked ? "Unblock" : "Block"}
                      >
                        <span className="material-symbols-outlined text-[16px]">{c.is_blocked ? "lock_open" : "block"}</span>
                      </button>
                      <button onClick={() => setConfirmId(confirmId === c.id ? null : c.id)} className="text-accent/50 hover:text-red-400 transition-colors flex-shrink-0" title="Delete">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete confirmation */}
                {confirmId === c.id && (
                  <div className="border-t border-red-900/30 bg-red-500/[0.06] px-4 py-3">
                    <p className="tabular-nums text-[11px] text-red-300 mb-2">
                      Delete <span className="text-white">{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}</span>? Cannot be undone.
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setConfirmId(null)} className="tabular-nums text-[11px] text-accent/70 hover:text-fg transition-colors">Cancel</button>
                      <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id} className="flex items-center gap-1.5 px-3 py-1 bg-red-600/20 border border-red-600/50 text-red-400 tabular-nums text-[11px] hover:bg-red-600/30 transition-colors disabled:opacity-50 font-medium">
                        {deletingId === c.id ? <span className="material-symbols-outlined animate-spin text-[13px]">progress_activity</span> : <span className="material-symbols-outlined text-[13px]">delete</span>}
                        {deletingId === c.id ? "Deleting…" : "Delete"}
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
              <tr className="border-b border-line/40">
                {["", "Name", "Email", "Provider", "Location", "Phone", ""].map((h, i) => (
                  <th key={i} className="text-left tabular-nums text-[10px] uppercase text-accent/60 px-3 py-3 whitespace-nowrap tracking-wider font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <Fragment key={c.id}>
                  <tr className="border-b border-line/15 hover:bg-panel transition-colors">
                    {/* Avatar */}
                    <td className="px-3 py-3 w-10">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <span className="tabular-nums text-[10px] text-primary font-bold">{initials(c)}</span>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-[13px] text-fg whitespace-nowrap">
                          {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                        </p>
                        <SocialIcons c={c} />
                        {c.is_blocked && (
                          <span className="tabular-nums text-[9px] uppercase border border-red-500/40 bg-red-500/10 text-red-400 px-1.5 py-px flex-shrink-0 tracking-wider font-medium rounded">
                            blocked
                          </span>
                        )}
                      </div>
                      <p className="tabular-nums text-[10px] text-accent/50 mt-0.5">
                        {new Date(c.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}
                      </p>
                    </td>

                    {/* Email */}
                    <td className="px-3 py-3 tabular-nums text-[12px] text-accent/70 whitespace-nowrap">
                      {c.email}
                    </td>

                    {/* Provider */}
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center tabular-nums text-[10px] uppercase border px-2 py-0.5 tracking-wider font-medium rounded ${PROVIDER_COLORS[c.auth_provider] ?? PROVIDER_COLORS.email}`}>
                        {c.auth_provider}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-3 py-3 tabular-nums text-[12px] text-accent/70 whitespace-nowrap">
                      {[c.billing_city, c.billing_state].filter(Boolean).join(", ") || "—"}
                    </td>

                    {/* Phone */}
                    <td className="px-3 py-3 tabular-nums text-[12px] text-accent/70 whitespace-nowrap">
                      {c.billing_phone || "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="p-1.5 text-accent/50 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </Link>
                        <button
                          onClick={() => handleToggleBlock(c)}
                          disabled={blockingId === c.id}
                          className={`p-1.5 transition-colors disabled:opacity-40 ${c.is_blocked ? "text-red-400 hover:text-green-400" : "text-accent/50 hover:text-red-400"}`}
                          title={c.is_blocked ? "Unblock" : "Block"}
                        >
                          <span className="material-symbols-outlined text-[16px]">{c.is_blocked ? "lock_open" : "block"}</span>
                        </button>
                        <button
                          onClick={() => setConfirmId(confirmId === c.id ? null : c.id)}
                          className="p-1.5 text-accent/50 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Delete confirmation row */}
                  {confirmId === c.id && (
                    <tr className="border-b border-line/15 bg-red-500/[0.06]">
                      <td colSpan={7} className="px-5 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <p className="tabular-nums text-[11px] text-red-300">
                            Delete <span className="text-white">{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}</span>? This also deletes their account and cannot be undone.
                          </p>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <button
                              onClick={() => setConfirmId(null)}
                              className="tabular-nums text-[11px] text-accent/70 hover:text-fg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deletingId === c.id}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600/20 border border-red-600/50 text-red-400 tabular-nums text-[11px] hover:bg-red-600/30 transition-colors disabled:opacity-50 font-medium"
                            >
                              {deletingId === c.id
                                ? <span className="material-symbols-outlined animate-spin text-[13px]">progress_activity</span>
                                : <span className="material-symbols-outlined text-[13px]">delete</span>
                              }
                              {deletingId === c.id ? "Deleting…" : "Delete"}
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
    </div>
  );
}
