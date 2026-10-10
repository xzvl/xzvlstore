"use client";

import { useState } from "react";
import {
  THEME_MODES,
  isHexColor,
  type HeroContent,
  type HeroSlide,
  type HeroSlideColors,
  type ThemeMode,
} from "@/lib/site-content";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE, INPUT, LABEL } from "@/components/admin/formKit";
import ImageUploader from "@/components/admin/ImageUploader";
import SaveBar from "@/components/admin/SaveBar";

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isHexColor(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-11 h-11 p-1 bg-fg/[0.05] border border-line cursor-pointer flex-shrink-0"
          aria-label={`${label} picker`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="#0e0e0e"
          maxLength={7}
          className={`${INPUT} ${isHexColor(value) ? "" : "!border-primary"}`}
        />
      </div>
    </div>
  );
}

const MODE_META: Record<ThemeMode, { title: string; icon: string }> = {
  dark: { title: "Dark Mode", icon: "dark_mode" },
  light: { title: "Light Mode", icon: "light_mode" },
};

export default function HeroTab({
  initial,
  onSaved,
}: {
  initial: HeroContent;
  onSaved: (v: HeroContent) => void;
}) {
  const { value, setValue, saving, message, error, save } = useSectionEditor("hero", initial, onSaved);
  const [active, setActive] = useState(0);

  const slide = value.slides[active];
  const update = (patch: Partial<HeroSlide>) =>
    setValue((v) => ({ ...v, slides: v.slides.map((s, i) => (i === active ? { ...s, ...patch } : s)) }));
  const updateColor = (mode: ThemeMode, patch: Partial<HeroSlideColors>) =>
    update({ colors: { ...slide.colors, [mode]: { ...slide.colors[mode], ...patch } } });

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <p className={CARD_TITLE}>Hero Slider</p>
        <p className="tabular-nums text-[11px] text-accent/60">
          The three slides at the top of the homepage. Pick a slide, edit it, then save.
        </p>
        <div className="flex gap-2 flex-wrap">
          {value.slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              className={`px-4 py-2 border tabular-nums text-[10px] uppercase transition-colors tracking-wider font-medium ${
                active === i
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-line/50 text-accent/70 hover:border-accent/40 hover:text-fg"
              }`}
            >
              Slide {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Text — Slide {active + 1}</p>
        <div>
          <label className={LABEL}>Tag (small line above the title)</label>
          <input value={slide.tag} onChange={(e) => update({ tag: e.target.value })} className={INPUT} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Title — main text</label>
            <input value={slide.titleWhite} onChange={(e) => update({ titleWhite: e.target.value })} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>
              Title — <span className="text-primary">red</span> text
            </label>
            <input value={slide.titleRed} onChange={(e) => update({ titleRed: e.target.value })} className={INPUT} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Content / short description</label>
          <textarea
            value={slide.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={3}
            className={INPUT}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Button label</label>
            <input
              value={slide.buttonLabel}
              onChange={(e) => update({ buttonLabel: e.target.value })}
              placeholder="Leave empty to hide the button"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Button link</label>
            <input
              value={slide.buttonLink}
              onChange={(e) => update({ buttonLink: e.target.value })}
              placeholder="/collection/all"
              className={INPUT}
            />
          </div>
        </div>
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Images &amp; Colors — Slide {active + 1}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ImageUploader
            label="Image"
            hint="Product / feature image shown on the right side (desktop)."
            value={slide.image}
            onChange={(image) => update({ image })}
          />
          <ImageUploader
            label="Background"
            hint="Optional full-width image behind the slide."
            value={slide.background}
            onChange={(background) => update({ background })}
          />
        </div>
        <p className="tabular-nums text-[11px] text-accent/60">
          Background color fills the slide and fades the images into it. Text color is used for the main title line, the
          description and the slide controls. The red title line and button always use the Primary color from the Colors tab.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {THEME_MODES.map((mode) => {
            const c = slide.colors[mode];
            return (
              <div key={mode} className="space-y-3">
                <p className="flex items-center gap-2 tabular-nums text-[10px] uppercase text-fg tracking-wider font-medium">
                  <span className="material-symbols-outlined text-[16px]">{MODE_META[mode].icon}</span>
                  {MODE_META[mode].title}
                </p>
                <ColorField label="Background color" value={c.background} onChange={(background) => updateColor(mode, { background })} />
                <ColorField label="Text color" value={c.text} onChange={(text) => updateColor(mode, { text })} />
                {/* Preview */}
                <div
                  className="border border-line/40 px-4 py-3"
                  style={{ backgroundColor: isHexColor(c.background) ? c.background : undefined }}
                >
                  <p
                    className="font-semibold text-[16px] leading-tight font-medium"
                    style={{ color: isHexColor(c.text) ? c.text : undefined }}
                  >
                    {slide.titleWhite || "Title"}
                  </p>
                  <p className="font-semibold text-[16px] leading-tight text-primary font-medium">
                    {slide.titleRed}
                  </p>
                  <p
                    className="tabular-nums text-[10px] mt-1 line-clamp-2"
                    style={{ color: isHexColor(c.text) ? c.text : undefined, opacity: 0.65 }}
                  >
                    {slide.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Hero" />
    </div>
  );
}
