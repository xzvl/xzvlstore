"use client";

import {
  DEFAULT_COLORS,
  PALETTE_KEYS,
  THEME_MODES,
  isHexColor,
  type ColorsContent,
  type Palette,
  type PaletteKey,
  type ThemeMode,
} from "@/lib/site-content";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE, INPUT, LABEL } from "@/components/admin/formKit";
import SaveBar from "@/components/admin/SaveBar";

const FIELDS: Record<PaletteKey, { label: string; hint: string }> = {
  primary: { label: "Primary", hint: "Buttons, links, highlights, badges" },
  accent: { label: "Accent", hint: "Secondary text, labels, captions" },
  text: { label: "Text", hint: "Main body text and headings" },
  background: { label: "Background", hint: "Page background" },
  surface: { label: "Surface", hint: "Cards, panels, inputs" },
  surfaceDeep: { label: "Surface (Deep)", hint: "Contrasting page sections" },
  border: { label: "Border", hint: "Lines, dividers, outlines" },
  header: { label: "Header", hint: "Top bar background" },
  headerText: { label: "Header Text", hint: "Logo text, menu links and icons" },
};

const MODE_META: Record<ThemeMode, { title: string; icon: string }> = {
  dark: { title: "Dark Mode", icon: "dark_mode" },
  light: { title: "Light Mode", icon: "light_mode" },
};

// Mini storefront mock-up so a palette can be judged before saving. Uses the
// raw values with fallbacks, since half-typed hex values are invalid CSS.
function Preview({ palette, fallback }: { palette: Palette; fallback: Palette }) {
  const c = (k: PaletteKey) => (isHexColor(palette[k]) ? palette[k] : fallback[k]);
  return (
    <div className="border overflow-hidden" style={{ backgroundColor: c("background"), borderColor: c("border") }}>
      <div
        className="flex items-center justify-between px-3 h-9 border-b"
        style={{ backgroundColor: c("header"), borderColor: c("border"), color: c("headerText") }}
      >
        <span className="font-inter font-black text-[12px] uppercase">
          xzvl<span style={{ color: c("primary") }}>.</span>store
        </span>
        <span className="flex gap-2 opacity-60">
          {["light_mode", "person", "search", "shopping_cart"].map((i) => (
            <span key={i} className="material-symbols-outlined text-[14px]">{i}</span>
          ))}
        </span>
      </div>
      <div className="p-3 space-y-2">
        <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: c("primary") }}>
          // New Arrivals
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="border p-2 space-y-1" style={{ backgroundColor: c("surface"), borderColor: c("border") }}>
              <p className="font-inter font-bold text-[11px]" style={{ color: c("text") }}>
                Product {i + 1}
              </p>
              <p className="font-mono text-[9px]" style={{ color: c("accent") }}>Takara Tomy</p>
              <span className="inline-block font-mono text-[8px] px-1.5 py-0.5 text-white uppercase" style={{ backgroundColor: c("primary") }}>
                Add to cart
              </span>
            </div>
          ))}
        </div>
        <div className="p-2 font-mono text-[9px]" style={{ backgroundColor: c("surfaceDeep"), color: c("accent") }}>
          Deep section
        </div>
      </div>
    </div>
  );
}

export default function ColorsTab({
  initial,
  onSaved,
}: {
  initial: ColorsContent;
  onSaved: (v: ColorsContent) => void;
}) {
  const { value, set, saving, message, error, save } = useSectionEditor("colors", initial, onSaved);

  const setColor = (mode: ThemeMode, key: PaletteKey, v: string) => set(mode, { ...value[mode], [key]: v });

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <p className={CARD_TITLE}>Default Mode</p>
        <p className="font-mono text-[11px] text-accent/40">
          What visitors see first. They can switch with the sun/moon icon in the header, and their choice is remembered
          on that device.
        </p>
        <div className="flex gap-2">
          {THEME_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => set("defaultMode", mode)}
              className={`flex items-center gap-2 px-4 py-2 border font-mono text-[11px] tracking-widest uppercase transition-colors ${
                value.defaultMode === mode
                  ? "border-primary text-primary bg-primary/10"
                  : "border-line text-accent/50 hover:text-fg"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{MODE_META[mode].icon}</span>
              {mode}
            </button>
          ))}
        </div>
      </div>

      {THEME_MODES.map((mode) => (
        <div key={mode} className={CARD}>
          <div className="flex items-center justify-between gap-4">
            <p className={`${CARD_TITLE} flex items-center gap-2`}>
              <span className="material-symbols-outlined text-[16px]">{MODE_META[mode].icon}</span>
              {MODE_META[mode].title}
            </p>
            <button
              type="button"
              onClick={() => set(mode, DEFAULT_COLORS[mode])}
              className="flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase text-accent/50 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">restart_alt</span>
              Reset to defaults
            </button>
          </div>

          <div className="grid xl:grid-cols-[1fr_260px] gap-6 items-start">
            <div className="grid sm:grid-cols-2 gap-4">
              {PALETTE_KEYS.map((key) => {
                const v = value[mode][key];
                const valid = isHexColor(v);
                return (
                  <div key={key}>
                    <label className={LABEL}>{FIELDS[key].label}</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={valid ? v : DEFAULT_COLORS[mode][key]}
                        onChange={(e) => setColor(mode, key, e.target.value)}
                        className="w-11 h-11 p-1 bg-fg/[0.05] border border-line cursor-pointer flex-shrink-0"
                        aria-label={`${MODE_META[mode].title} ${FIELDS[key].label} picker`}
                      />
                      <input
                        value={v}
                        onChange={(e) => setColor(mode, key, e.target.value.trim())}
                        placeholder={DEFAULT_COLORS[mode][key]}
                        maxLength={7}
                        className={`${INPUT} ${valid ? "" : "!border-primary"}`}
                      />
                    </div>
                    <p className="font-mono text-[10px] text-accent/30 mt-1">{FIELDS[key].hint}</p>
                  </div>
                );
              })}
            </div>
            <div className="xl:sticky xl:top-4">
              <p className={LABEL}>Preview</p>
              <Preview palette={value[mode]} fallback={DEFAULT_COLORS[mode]} />
            </div>
          </div>
        </div>
      ))}

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Colors" />
    </div>
  );
}
