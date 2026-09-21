"use client";

import { useState } from "react";
import { isHexColor, type HeroContent, type HeroSlide } from "@/lib/site-content";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE, INPUT, LABEL } from "@/components/admin/formKit";
import ImageUploader from "@/components/admin/ImageUploader";
import SaveBar from "@/components/admin/SaveBar";

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

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <p className={CARD_TITLE}>Hero Slider</p>
        <p className="font-mono text-[11px] text-[#ebbbb4]/40">
          The three slides at the top of the homepage. Pick a slide, edit it, then save.
        </p>
        <div className="flex gap-2 flex-wrap">
          {value.slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              className={`px-4 py-2 border font-mono text-[10px] tracking-widest uppercase transition-colors ${
                active === i
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-[#603e39]/50 text-[#ebbbb4]/50 hover:border-[#ebbbb4]/40 hover:text-[#e2e2e2]"
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
            <label className={LABEL}>Title — white text</label>
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
        <div className="max-w-xs">
          <label className={LABEL}>Background color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isHexColor(slide.backgroundColor) ? slide.backgroundColor : "#000000"}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              className="w-11 h-11 p-1 bg-[#1f1f1f] border border-[#603e39] cursor-pointer flex-shrink-0"
              aria-label="Background color picker"
            />
            <input
              value={slide.backgroundColor}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              placeholder="#0e0e0e"
              maxLength={7}
              className={INPUT}
            />
          </div>
        </div>
      </div>

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Hero" />
    </div>
  );
}
