"use client";

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
  onSaved,
}: {
  initial: EmailContent;
  onSaved: (v: EmailContent) => void;
}) {
  const { value, set, saving, message, error, save } = useSectionEditor("email", initial, onSaved);

  const setColor = (key: keyof EmailColors, v: string) => set("colors", { ...value.colors, [key]: v });
  const setText = (key: keyof EmailContent["text"], v: string) => set("text", { ...value.text, [key]: v });

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

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Email" />
    </div>
  );
}
