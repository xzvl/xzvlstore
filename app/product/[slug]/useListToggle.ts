"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";

// Toggle state for one product on one of the customer's lists
// (/api/account/favorites or /api/account/waitlist). Signed-out visitors can
// see the public count; toggling sends them to the login page.
export function useListToggle(endpoint: "favorites" | "waitlist", productId: string) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      try {
        const res = await fetch(`/api/account/${endpoint}?product_id=${encodeURIComponent(productId)}`, {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (!res.ok) return;
        const data: { count: number; active: boolean } = await res.json();
        if (!cancelled) { setActive(data.active); setCount(data.count); }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [endpoint, productId]);

  const toggle = useCallback(async () => {
    if (busy) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { router.push("/auth/login"); return; }

    const next = !active;
    setBusy(true);
    setError("");
    setActive(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const res = next
        ? await fetch(`/api/account/${endpoint}`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: productId }),
          })
        : await fetch(`/api/account/${endpoint}?product_id=${encodeURIComponent(productId)}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Something went wrong.");
    } catch (err) {
      setActive(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }, [active, busy, endpoint, productId, router]);

  return { active, count, busy, error, toggle };
}
