"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/account");
      } else {
        router.replace("/auth/login");
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
      <div className="flex items-center gap-3 font-mono text-[12px] text-[#ebbbb4]/40">
        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
        Signing you in…
      </div>
    </div>
  );
}
