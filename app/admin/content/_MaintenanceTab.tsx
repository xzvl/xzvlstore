"use client";

import type { MaintenanceContent } from "@/lib/site-content";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE, INPUT, LABEL } from "@/components/admin/formKit";
import ImageUploader from "@/components/admin/ImageUploader";
import SaveBar from "@/components/admin/SaveBar";

export default function MaintenanceTab({
  initial,
  forced,
  onSaved,
}: {
  initial: MaintenanceContent;
  /** MAINTENANCE_MODE=true in the environment: storefront is hidden regardless of the toggle. */
  forced: boolean;
  onSaved: (v: MaintenanceContent) => void;
}) {
  const { value, set, saving, message, error, save } = useSectionEditor("maintenance", initial, onSaved);

  return (
    <div className="space-y-6">
      {forced && (
        <div className="flex items-start gap-3 border border-primary bg-primary/10 p-4">
          <span className="material-symbols-outlined text-[18px] text-primary">lock</span>
          <p className="font-mono text-[11px] text-[#e2e2e2] leading-relaxed">
            <span className="text-primary font-bold">Forced on by environment variable.</span> MAINTENANCE_MODE=true is
            set on the server, so the storefront shows the maintenance screen regardless of the switch below. Remove it
            (or set it to false) and redeploy to hand control back to this toggle. You can still edit the page content.
          </p>
        </div>
      )}

      <div className={`${CARD} ${initial.enabled ? "border-primary/60" : ""}`}>
        <p className={CARD_TITLE}>Maintenance Mode</p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[12px] text-[#e2e2e2]">
              Currently{" "}
              <span className={initial.enabled ? "text-primary font-bold" : "text-green-400 font-bold"}>
                {initial.enabled ? "ON — storefront is hidden" : "OFF — storefront is live"}
              </span>
            </p>
            <p className="font-mono text-[11px] text-[#ebbbb4]/40 mt-1">
              When on, every storefront page shows the maintenance screen below. The admin panel stays accessible.
              Changes take effect after saving.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={value.enabled}
            onClick={() => set("enabled", !value.enabled)}
            className="flex items-center gap-3 font-mono text-[11px] tracking-widest uppercase"
          >
            <span
              className={`relative w-12 h-6 border transition-colors ${
                value.enabled ? "bg-primary/20 border-primary" : "bg-[#1f1f1f] border-[#603e39]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-[18px] h-[18px] transition-all ${
                  value.enabled ? "left-[26px] bg-primary" : "left-0.5 bg-[#ebbbb4]/40"
                }`}
              />
            </span>
            <span className={value.enabled ? "text-primary" : "text-[#ebbbb4]/50"}>{value.enabled ? "On" : "Off"}</span>
          </button>
        </div>
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Page Content</p>
        <div>
          <label className={LABEL}>Tag (small line above the title)</label>
          <input value={value.tag} onChange={(e) => set("tag", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Title</label>
          <input value={value.title} onChange={(e) => set("title", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Message</label>
          <textarea value={value.message} onChange={(e) => set("message", e.target.value)} rows={4} className={INPUT} />
        </div>
        <label className="flex items-center gap-2 font-mono text-[11px] text-[#ebbbb4]/70 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={value.showSocialLinks}
            onChange={(e) => set("showSocialLinks", e.target.checked)}
            className="accent-primary"
          />
          Show social links (from the Footer tab)
        </label>
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Image</p>
        <p className="font-mono text-[11px] text-[#ebbbb4]/40">
          Optional image shown above the title. Leave empty to show a construction icon instead.
        </p>
        <ImageUploader label="Maintenance image" value={value.image} onChange={(url) => set("image", url)} />
      </div>

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Maintenance" />
    </div>
  );
}
