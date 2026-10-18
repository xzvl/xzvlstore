"use client";

import type { BrandingContent } from "@/lib/site-content";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE } from "@/components/admin/formKit";
import ImageUploader from "@/components/admin/ImageUploader";
import SaveBar from "@/components/admin/SaveBar";

export default function BrandingTab({
  initial,
  onSaved,
}: {
  initial: BrandingContent;
  onSaved: (v: BrandingContent) => void;
}) {
  const { value, set, saving, message, error, save } = useSectionEditor("branding", initial, onSaved);

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <p className={CARD_TITLE}>Logo</p>
        <p className="tabular-nums text-[11px] text-accent/60">
          Shown in the header and footer. PNG/JPG uploads are converted to WebP automatically. Use a wide, transparent
          image for best results. Leave empty to keep the default &quot;xzvl.store&quot; text logo.
        </p>
        <ImageUploader label="Logo image" value={value.logoImageUrl} onChange={(url) => set("logoImageUrl", url)} />
        <p className="tabular-nums text-[11px] text-accent/60">
          Alternative logo, shown instead of the one above when a visitor has the storefront in dark mode. Leave empty
          to always use the logo above.
        </p>
        <ImageUploader label="Alternative logo (dark mode)" value={value.logoImageUrlDark} onChange={(url) => set("logoImageUrlDark", url)} />
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Favicon</p>
        <p className="tabular-nums text-[11px] text-accent/60">
          The small icon in browser tabs and bookmarks. Use a square image (512&times;512 or larger). Browsers cache
          favicons aggressively, so a change can take a while to appear. Leave empty for the default.
        </p>
        <ImageUploader label="Favicon" value={value.faviconUrl} onChange={(url) => set("faviconUrl", url)} />
        <p className="tabular-nums text-[11px] text-accent/60">
          Alternative favicon, used for the brand mark in /admin and the login page instead of the one above when
          Colors → Default mode is dark. Leave empty to always use the favicon above.
        </p>
        <ImageUploader label="Alternative favicon (dark mode)" value={value.faviconUrlDark} onChange={(url) => set("faviconUrlDark", url)} />
      </div>

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Branding" />
    </div>
  );
}
