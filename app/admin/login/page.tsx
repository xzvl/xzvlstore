"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSiteContent } from "@/components/SiteContentProvider";

export default function AdminLoginPage() {
  const { branding, colors } = useSiteContent();
  // /admin is pinned to Colors → Default mode, never the visitor's own toggle,
  // so the favicon variant is picked from that setting (see AdminShell's Brand).
  const favicon = (colors.defaultMode === "dark" && branding.faviconUrlDark) || branding.faviconUrl;
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Password managers (Keeper, 1Password, …) inject elements/attributes into
  // password fields before React hydrates, which triggers a hydration
  // mismatch. Rendering the form only after mount keeps the server and first
  // client render identical, so the extension can only touch the DOM after
  // hydration is done.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid password.");
      }
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-deep flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-panel border border-line/40 rounded-xl p-6 sm:p-8 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2.5 mb-6">
          {favicon ? (
            <span className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 shadow-sm shadow-primary/30">
              <Image src={favicon} alt="xzvl.store" fill sizes="36px" className="object-cover" />
            </span>
          ) : (
            <span className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-[15px] shadow-sm shadow-primary/30">
              X
            </span>
          )}
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-fg">xzvl.store</p>
            <p className="text-[11px] text-accent/60">Back office</p>
          </div>
        </div>
        <h1 className="font-semibold text-fg text-[20px] tracking-tight">Sign in</h1>
        <p className="text-[13px] text-accent/60 mt-1 mb-6">Enter the admin password to continue.</p>

        {!mounted ? (
          <div className="h-[188px]" aria-hidden />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block tabular-nums text-[11px] text-accent/70 mb-2 font-medium">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full bg-fg/[0.05] border border-line text-fg tabular-nums text-[13px] px-3.5 py-2.5 focus:outline-none focus:border-primary transition-colors focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="flex items-center gap-1.5 tabular-nums text-[12px] text-red-400">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full px-6 py-2.5 bg-primary text-white text-[13px] hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
