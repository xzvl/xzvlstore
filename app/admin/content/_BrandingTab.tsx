"use client";

import { isEmailOrEmpty, type BrandingContent } from "@/lib/site-content";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE, INPUT, LABEL } from "@/components/admin/formKit";
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

      <div className={CARD}>
        <p className={CARD_TITLE}>Email</p>
        <p className="tabular-nums text-[11px] text-accent/60">
          The addresses this store's emails are sent from and to. Leave any of these empty to use its built-in default.
        </p>

        <div>
          <label className={LABEL}>System Email</label>
          <input
            value={value.systemEmail}
            onChange={(e) => set("systemEmail", e.target.value.trim())}
            placeholder="onboarding@resend.dev"
            className={`${INPUT} ${isEmailOrEmpty(value.systemEmail) ? "" : "!border-primary"}`}
          />
          <p className="tabular-nums text-[10px] text-accent/50 mt-1">
            The &quot;from&quot; address on every email this store sends — must be verified with your email provider
            (Resend).
          </p>
        </div>

        <div>
          <label className={LABEL}>Order Email</label>
          <input
            value={value.orderEmail}
            onChange={(e) => set("orderEmail", e.target.value.trim())}
            placeholder="xzviel@gmail.com"
            className={`${INPUT} ${isEmailOrEmpty(value.orderEmail) ? "" : "!border-primary"}`}
          />
          <p className="tabular-nums text-[10px] text-accent/50 mt-1">
            Receives the &quot;New Order&quot; / &quot;New Pre-Order&quot; notification emails.
          </p>
        </div>

        <div>
          <label className={LABEL}>Website Email</label>
          <input
            value={value.websiteEmail}
            onChange={(e) => set("websiteEmail", e.target.value.trim())}
            placeholder="hello@xzvl.store"
            className={`${INPUT} ${isEmailOrEmpty(value.websiteEmail) ? "" : "!border-primary"}`}
          />
          <p className="tabular-nums text-[10px] text-accent/50 mt-1">
            Shown as a contact email in the storefront footer. Leave empty to hide it.
          </p>
        </div>
      </div>

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Branding" />
    </div>
  );
}
