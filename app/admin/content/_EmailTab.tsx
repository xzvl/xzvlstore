"use client";

import { useState } from "react";
import {
  DEFAULT_EMAIL,
  isHexColor,
  type EmailColors,
  type EmailContent,
} from "@/lib/site-content";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE, INPUT, LABEL } from "@/components/admin/formKit";
import SaveBar from "@/components/admin/SaveBar";

const COLOR_FIELDS: Record<keyof EmailColors, { label: string; hint: string }> = {
  background: { label: "Background", hint: "Thin margin around the card" },
  panel: { label: "Panel", hint: "The card itself" },
  panelAccent: { label: "Panel Accent", hint: "Boxed sections inside the card" },
  border: { label: "Border", hint: "Around the card and between sections" },
  primary: { label: "Primary", hint: "Headings, totals, the button" },
  text: { label: "Text", hint: "Body text" },
  muted: { label: "Muted", hint: "Labels like \"Name\", \"Qty\"" },
};

const COLOR_KEYS = Object.keys(COLOR_FIELDS) as (keyof EmailColors)[];

// Mini mock-up of the customer "Thank You" email, so a palette can be judged
// before saving. Uses the raw values with fallbacks, since half-typed hex
// values are invalid CSS.
function Preview({ colors, greeting, buttonLabel }: { colors: EmailColors; greeting: string; buttonLabel: string }) {
  const c = (k: keyof EmailColors) => (isHexColor(colors[k]) ? colors[k] : DEFAULT_EMAIL.colors[k]);
  return (
    <div className="p-4" style={{ backgroundColor: c("background") }}>
      <div
        className="p-4 font-mono"
        style={{ backgroundColor: c("panel"), border: `1px solid ${c("border")}`, color: c("text") }}
      >
        <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: c("primary") }}>
          XZVL_STORE
        </p>
        <p className="text-[15px] font-black uppercase mb-2" style={{ color: c("text") }}>
          Thank You, Juan!
        </p>
        <p className="text-[10px] leading-relaxed mb-3" style={{ color: c("muted") }}>
          {greeting}
        </p>
        <div className="p-2.5 mb-3" style={{ backgroundColor: c("panelAccent"), border: `1px solid ${c("border")}` }}>
          <p className="text-[9px] uppercase mb-1" style={{ color: c("primary") }}>Order Summary</p>
          <div className="flex justify-between text-[10px]">
            <span style={{ color: c("muted") }}>Product</span>
            <span style={{ color: c("muted") }}>Subtotal</span>
          </div>
        </div>
        <p className="text-center text-[9px] uppercase tracking-widest py-2" style={{ backgroundColor: c("primary"), color: "#ffffff" }}>
          {buttonLabel || "View My Orders"}
        </p>
      </div>
    </div>
  );
}

export default function EmailTab({
  initial,
  websiteEmail,
  onSaved,
}: {
  initial: EmailContent;
  /** Branding → Website Email, used to prefill the test address below. */
  websiteEmail: string;
  onSaved: (v: EmailContent) => void;
}) {
  const { value, set, saving, message, error, save } = useSectionEditor("email", initial, onSaved);

  const setColor = (key: keyof EmailColors, v: string) => set("colors", { ...value.colors, [key]: v });
  const setText = (key: keyof EmailContent["text"], v: string) => set("text", { ...value.text, [key]: v });

  const [testEmail, setTestEmail] = useState(websiteEmail);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function sendTestEmail() {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail, content: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to send test email.");
      setTestResult({ ok: true, text: `Sent to ${testEmail}.` });
    } catch (err) {
      setTestResult({ ok: false, text: err instanceof Error ? err.message : "Failed to send test email." });
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <div className="flex items-center justify-between gap-4">
          <p className={CARD_TITLE}>Colors</p>
          <button
            type="button"
            onClick={() => set("colors", DEFAULT_EMAIL.colors)}
            className="flex items-center gap-1 tabular-nums text-[10px] uppercase text-accent/70 hover:text-primary transition-colors tracking-wider font-medium"
          >
            <span className="material-symbols-outlined text-[14px]">restart_alt</span>
            Reset to defaults
          </button>
        </div>
        <p className="tabular-nums text-[11px] text-accent/60">
          Used in every email this store sends (order/pre-order notifications and the customer &quot;Thank You&quot;
          email). Email clients ignore the storefront&apos;s theme, so these are fixed colors rather than a light/dark pair.
        </p>

        <div className="grid xl:grid-cols-[1fr_260px] gap-6 items-start">
          <div className="grid sm:grid-cols-2 gap-4">
            {COLOR_KEYS.map((key) => {
              const v = value.colors[key];
              const valid = isHexColor(v);
              return (
                <div key={key}>
                  <label className={LABEL}>{COLOR_FIELDS[key].label}</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={valid ? v : DEFAULT_EMAIL.colors[key]}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="w-11 h-11 p-1 bg-fg/[0.05] border border-line cursor-pointer flex-shrink-0"
                      aria-label={`${COLOR_FIELDS[key].label} picker`}
                    />
                    <input
                      value={v}
                      onChange={(e) => setColor(key, e.target.value.trim())}
                      placeholder={DEFAULT_EMAIL.colors[key]}
                      maxLength={7}
                      className={`${INPUT} ${valid ? "" : "!border-primary"}`}
                    />
                  </div>
                  <p className="tabular-nums text-[10px] text-accent/50 mt-1">{COLOR_FIELDS[key].hint}</p>
                </div>
              );
            })}
          </div>
          <div className="xl:sticky xl:top-4">
            <p className={LABEL}>Preview</p>
            <Preview colors={value.colors} greeting={value.text.greetingCheckout} buttonLabel={value.text.buttonLabel} />
          </div>
        </div>
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Text</p>
        <p className="tabular-nums text-[11px] text-accent/60">
          Shown in the customer-facing &quot;Thank You&quot; email after checkout or a pre-order.
        </p>

        <div>
          <label className={LABEL}>Tag</label>
          <input
            value={value.text.tag}
            onChange={(e) => setText("tag", e.target.value)}
            placeholder={DEFAULT_EMAIL.text.tag}
            className={INPUT}
          />
          <p className="tabular-nums text-[10px] text-accent/50 mt-1">Small line above the heading</p>
        </div>

        <div>
          <label className={LABEL}>Checkout Greeting</label>
          <textarea
            value={value.text.greetingCheckout}
            onChange={(e) => setText("greetingCheckout", e.target.value)}
            rows={2}
            className={`${INPUT} resize-none`}
          />
          <p className="tabular-nums text-[10px] text-accent/50 mt-1">Shown after a checkout order</p>
        </div>

        <div>
          <label className={LABEL}>Pre-Order Greeting</label>
          <textarea
            value={value.text.greetingPreOrder}
            onChange={(e) => setText("greetingPreOrder", e.target.value)}
            rows={2}
            className={`${INPUT} resize-none`}
          />
          <p className="tabular-nums text-[10px] text-accent/50 mt-1">Shown after a pre-order</p>
        </div>

        <div>
          <label className={LABEL}>Button Label</label>
          <input
            value={value.text.buttonLabel}
            onChange={(e) => setText("buttonLabel", e.target.value)}
            placeholder={DEFAULT_EMAIL.text.buttonLabel}
            className={INPUT}
          />
          <p className="tabular-nums text-[10px] text-accent/50 mt-1">Links to /account/orders</p>
        </div>
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Test</p>
        <p className="tabular-nums text-[11px] text-accent/60">
          Sends a sample &quot;Thank You&quot; email using the colors and text above — including any unsaved edits —
          so you can check it before saving. Defaults to the Website Email set in Branding.
        </p>
        <p className="flex items-start gap-1.5 tabular-nums text-[11px] text-accent/50">
          <span className="material-symbols-outlined text-[14px] flex-shrink-0 mt-px">info</span>
          Until a domain is verified at{" "}
          <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            resend.com/domains
          </a>{" "}
          and set as the System Email in Branding, Resend only delivers test emails to the address your Resend
          account was signed up with — any other address will fail.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className={`${INPUT} sm:max-w-xs`}
          />
          <button
            type="button"
            onClick={sendTestEmail}
            disabled={testSending || !testEmail.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-line/60 text-accent/80 tabular-nums text-[11px] uppercase hover:border-primary hover:text-primary transition-colors disabled:opacity-50 tracking-wider font-medium flex-shrink-0"
          >
            <span className={`material-symbols-outlined text-[14px] ${testSending ? "animate-spin" : ""}`}>
              {testSending ? "progress_activity" : "send"}
            </span>
            {testSending ? "Sending…" : "Send Test Email"}
          </button>
        </div>
        {testResult && (
          <p className={`flex items-center gap-1.5 tabular-nums text-[11px] ${testResult.ok ? "text-green-400" : "text-red-400"}`}>
            <span className="material-symbols-outlined text-[14px]">{testResult.ok ? "check_circle" : "error"}</span>
            {testResult.text}
          </p>
        )}
      </div>

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Email" />
    </div>
  );
}
