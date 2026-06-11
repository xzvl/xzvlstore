"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase-client";

const INPUT = "w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset-password`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#131313] border border-[#603e39]/50 p-8 text-center space-y-4">
          <span className="material-symbols-outlined text-[40px] text-primary">mark_email_unread</span>
          <h2 className="font-inter font-black text-[22px] uppercase text-[#e2e2e2]">Check your email</h2>
          <p className="font-mono text-[12px] text-[#ebbbb4]/60 leading-relaxed">
            A password reset link was sent to <span className="text-[#e2e2e2]">{email}</span>.
          </p>
          <Link href="/auth/login" className="inline-block font-mono text-[11px] text-primary hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <p className="font-mono text-[10px] tracking-[0.3em] text-primary uppercase mb-1">xzvl.store</p>
            <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2] tracking-tight">Reset Password</h1>
          </Link>
          <p className="font-mono text-[11px] text-[#ebbbb4]/50 mt-2">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="bg-[#131313] border border-[#603e39]/50 p-8 space-y-5">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className={INPUT}
              />
            </div>

            {error && <p className="font-mono text-[11px] text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-mono text-[11px] tracking-widest uppercase hover:bg-[#c00] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>

          <p className="text-center font-mono text-[11px] text-[#ebbbb4]/40">
            <Link href="/auth/login" className="text-primary hover:underline">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
