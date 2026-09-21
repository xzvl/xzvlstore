"use client";

import { SOCIAL_PLATFORMS, type FooterContent, type NavLink, type SocialLink, type SocialPlatform } from "@/lib/site-content";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE, INPUT, LABEL } from "@/components/admin/formKit";
import ListEditor from "@/components/admin/ListEditor";
import SaveBar from "@/components/admin/SaveBar";

const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  other: "Other (generic link icon)",
};

export default function FooterTab({
  initial,
  onSaved,
}: {
  initial: FooterContent;
  onSaved: (v: FooterContent) => void;
}) {
  const { value, set, setValue, saving, message, error, save } = useSectionEditor("footer", initial, onSaved);

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <p className={CARD_TITLE}>Description</p>
        <div>
          <label className={LABEL}>Text under the logo</label>
          <textarea value={value.description} onChange={(e) => set("description", e.target.value)} rows={3} className={INPUT} />
        </div>
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Navigation Links</p>
        <p className="font-mono text-[11px] text-[#ebbbb4]/40">The &quot;Shop&quot; column of links in the footer.</p>
        <ListEditor<NavLink>
          items={value.navLinks}
          onChange={(navLinks) => setValue((v) => ({ ...v, navLinks }))}
          itemLabel="Link"
          newItem={() => ({ label: "New Link", href: "/" })}
          renderItem={(item, update) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Label</label>
                <input value={item.label} onChange={(e) => update({ label: e.target.value })} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Link (path or full URL)</label>
                <input
                  value={item.href}
                  onChange={(e) => update({ href: e.target.value })}
                  placeholder="/collection/all"
                  className={INPUT}
                />
              </div>
            </div>
          )}
        />
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Social Links</p>
        <ListEditor<SocialLink>
          items={value.socialLinks}
          onChange={(socialLinks) => setValue((v) => ({ ...v, socialLinks }))}
          itemLabel="Social"
          newItem={() => ({ platform: "facebook", url: "https://" })}
          renderItem={(item, update) => (
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
              <div>
                <label className={LABEL}>Platform (icon)</label>
                <select
                  value={item.platform}
                  onChange={(e) => update({ platform: e.target.value as SocialPlatform })}
                  className={INPUT}
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>{PLATFORM_NAMES[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>URL</label>
                <input
                  value={item.url}
                  onChange={(e) => update({ url: e.target.value })}
                  placeholder="https://www.facebook.com/…"
                  className={INPUT}
                />
              </div>
            </div>
          )}
        />
        <div>
          <label className={LABEL}>Note under the icons</label>
          <input
            value={value.socialNote}
            onChange={(e) => set("socialNote", e.target.value)}
            placeholder="Leave empty to hide"
            className={INPUT}
          />
        </div>
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Bottom Bar</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Copyright text</label>
            <input value={value.bottomText} onChange={(e) => set("bottomText", e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Tagline (right side, next to the dot)</label>
            <input
              value={value.bottomTagline}
              onChange={(e) => set("bottomTagline", e.target.value)}
              placeholder="Leave empty to hide"
              className={INPUT}
            />
          </div>
        </div>
      </div>

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Footer" />
    </div>
  );
}
