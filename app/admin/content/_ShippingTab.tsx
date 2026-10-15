"use client";

import { useState } from "react";
import type { ShippingContent } from "@/lib/site-content";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE, INPUT, LABEL } from "@/components/admin/formKit";
import SaveBar from "@/components/admin/SaveBar";

export default function ShippingTab({
  initial,
  onSaved,
}: {
  initial: ShippingContent;
  onSaved: (v: ShippingContent) => void;
}) {
  const { value, set, saving, message, error, save } = useSectionEditor("shipping", initial, onSaved);
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Checks the saved endpoint through our own API (the same path checkout uses).
  async function testConnection() {
    setTesting(true);
    setTest(null);
    try {
      const res = await fetch("/api/shipping/areas", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data)) throw new Error(data?.error || "No response.");
      setTest({ ok: true, text: `Connected — ${data.length} provinces loaded.` });
    } catch (err) {
      setTest({ ok: false, text: err instanceof Error ? err.message : "Connection failed." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <p className={CARD_TITLE}>J&amp;T Express</p>
        <p className="tabular-nums text-[11px] text-accent/60">
          Checkout and the pre-order form load provinces and cities from this API and quote the shipping fee
          from it. Pouch size and weight are set per product.
        </p>
        <div>
          <label className={LABEL}>API Endpoint</label>
          <input
            value={value.jntApiEndpoint}
            onChange={(e) => set("jntApiEndpoint", e.target.value)}
            placeholder="https://ylofficialjw.jtexpress.ph"
            className={INPUT}
          />
          <p className="tabular-nums text-[10px] text-accent/50 mt-1.5">
            Base URL only. Calls /website/base/info/area and /website/fee/findRates.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Sender Address (J&amp;T area name)</label>
            <input
              value={value.senderAddr}
              onChange={(e) => set("senderAddr", e.target.value.toUpperCase())}
              placeholder="PAMPANGA-SAN-FERNANDO-CITY"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Service Type (productType)</label>
            <input
              value={value.productType}
              onChange={(e) => set("productType", e.target.value)}
              placeholder="EZ"
              className={INPUT}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 border border-line/60 text-accent/70 tabular-nums text-[10px] uppercase hover:border-primary hover:text-primary transition-colors disabled:opacity-50 tracking-wider font-medium"
          >
            <span className={`material-symbols-outlined text-[14px] ${testing ? "animate-spin" : ""}`}>
              {testing ? "progress_activity" : "network_check"}
            </span>
            Test Saved Endpoint
          </button>
          {test && (
            <span className={`tabular-nums text-[11px] flex items-center gap-1 ${test.ok ? "text-green-400" : "text-primary"}`}>
              <span className="material-symbols-outlined text-[14px]">{test.ok ? "check_circle" : "error"}</span>
              {test.text}
            </span>
          )}
        </div>
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Pickup</p>
        <div>
          <label className={LABEL}>Pickup Note (shown when a customer chooses pickup)</label>
          <textarea
            value={value.pickupNote}
            onChange={(e) => set("pickupNote", e.target.value)}
            rows={3}
            className={INPUT}
          />
        </div>
      </div>

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Shipping" />
    </div>
  );
}
