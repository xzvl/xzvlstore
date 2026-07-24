"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <main className="min-h-screen bg-[#131313] cyber-grid flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-2 uppercase">
          XZVL_STORE // ADMIN
        </p>
        <h1 className="font-inter font-black text-[32px] uppercase text-[#e2e2e2] mb-8">
          Sign In
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[11px] tracking-[0.15em] uppercase text-[#ebbbb4]/70 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-3 focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
              suppressHydrationWarning
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 font-mono text-[12px] text-primary">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full px-6 py-3 bg-primary text-white font-mono text-[12px] tracking-[0.15em] uppercase hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Enter Admin"}
          </button>
        </form>
      </div>
    </main>
  );
}
