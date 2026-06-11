"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  auth_provider: string;
  billing_phone: string;
  billing_city: string;
  billing_state: string;
  created_at: string;
};

const PROVIDER_COLORS: Record<string, string> = {
  email: "text-[#ebbbb4]/50 border-[#603e39]/50",
  google: "text-blue-400 border-blue-400/40",
  facebook: "text-blue-500 border-blue-500/40",
};

function initials(c: Customer) {
  return `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase() || c.email[0].toUpperCase();
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/customers")
      .then(r => r.json())
      .then(data => { setCustomers(data); setLoading(false); });
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-1">ADMIN // CUSTOMERS</p>
          <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">Customers</h1>
        </div>
        <Link
          href="/admin/customers/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/20 transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">person_add</span>
          New Customer
        </Link>
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#603e39]/40 focus-within:border-primary px-4 py-2.5 transition-colors flex-1 max-w-xs">
          <span className="material-symbols-outlined text-[#ebbbb4]/30 text-[16px]">search</span>
          <input
            type="text"
            placeholder="Search by name, email, or city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[#e2e2e2] font-mono text-[12px] focus:outline-none placeholder:text-[#ebbbb4]/20"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[#ebbbb4]/30 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
        {!loading && (
          <span className="font-mono text-[11px] text-[#ebbbb4]/30">
            {filtered.length} {filtered.length === 1 ? "customer" : "customers"}
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-12">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#603e39]/20 p-12 text-center">
          <span className="material-symbols-outlined text-[32px] text-[#ebbbb4]/20 block mb-3">group</span>
          <p className="font-mono text-[12px] text-[#ebbbb4]/30">
            {search ? "No customers match your search." : "No customers yet."}
          </p>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#603e39]/20 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#603e39]/20">
                {["", "Name", "Email", "Provider", "Location", "Phone", ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#ebbbb4]/30 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#603e39]/10">
              {filtered.map(c => (
                <Fragment key={c.id}>
                  <tr className="hover:bg-[#212121] transition-colors">
                    {/* Avatar */}
                    <td className="px-4 py-3 w-10">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <span className="font-mono text-[10px] text-primary font-bold">{initials(c)}</span>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="font-inter font-semibold text-[13px] text-[#e2e2e2] whitespace-nowrap">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                      </p>
                      <p className="font-mono text-[10px] text-[#ebbbb4]/30 mt-0.5">
                        {new Date(c.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 font-mono text-[12px] text-[#ebbbb4]/70 whitespace-nowrap">
                      {c.email}
                    </td>

                    {/* Provider */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 ${PROVIDER_COLORS[c.auth_provider] ?? PROVIDER_COLORS.email}`}>
                        {c.auth_provider}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 font-mono text-[12px] text-[#ebbbb4]/50 whitespace-nowrap">
                      {[c.billing_city, c.billing_state].filter(Boolean).join(", ") || "—"}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 font-mono text-[12px] text-[#ebbbb4]/50 whitespace-nowrap">
                      {c.billing_phone || "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="p-1.5 text-[#ebbbb4]/30 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </Link>
                        <button
                          onClick={() => setConfirmId(confirmId === c.id ? null : c.id)}
                          className="p-1.5 text-[#ebbbb4]/30 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Delete confirmation row */}
                  {confirmId === c.id && (
                    <tr className="bg-[#1f1212]">
                      <td colSpan={7} className="px-5 py-3 border-t border-red-900/30">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-mono text-[11px] text-red-300">
                            Delete <span className="text-white">{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}</span>? This also deletes their account and cannot be undone.
                          </p>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <button
                              onClick={() => setConfirmId(null)}
                              className="font-mono text-[11px] text-[#ebbbb4]/50 hover:text-[#e2e2e2] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deletingId === c.id}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600/20 border border-red-600/50 text-red-400 font-mono text-[11px] uppercase tracking-widest hover:bg-red-600/30 transition-colors disabled:opacity-50"
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
      )}
    </div>
  );
}
