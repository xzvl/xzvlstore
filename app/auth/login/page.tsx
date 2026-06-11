"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";

const INPUT = "w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/account");
    }
  };

  const signInWithGoogle = async () => {
    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <p className="font-mono text-[10px] tracking-[0.3em] text-primary uppercase mb-1">xzvl.store</p>
            <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2] tracking-tight">Sign In</h1>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[#131313] border border-[#603e39]/50 p-8 space-y-5">
          {/* OAuth */}
          <div className="space-y-3">
            <button
              onClick={signInWithGoogle}
              className="w-full py-3 bg-white text-[#333] font-mono text-[11px] tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#603e39]/30" />
            <span className="font-mono text-[10px] text-[#ebbbb4]/30 uppercase">or</span>
            <div className="flex-1 h-px bg-[#603e39]/30" />
          </div>

          {/* Email form */}
          <form onSubmit={signIn} className="space-y-4">
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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60">Password</label>
                <Link href="/auth/forgot-password" className="font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
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
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center font-mono text-[11px] text-[#ebbbb4]/40">
            No account?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
