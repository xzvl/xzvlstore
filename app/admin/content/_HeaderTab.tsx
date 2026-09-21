"use client";

import type { HeaderContent, NavLink } from "@/lib/site-content";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE, INPUT, LABEL } from "@/components/admin/formKit";
import ListEditor from "@/components/admin/ListEditor";
import SaveBar from "@/components/admin/SaveBar";

export default function HeaderTab({
  initial,
  onSaved,
}: {
  initial: HeaderContent;
  onSaved: (v: HeaderContent) => void;
}) {
  const { value, setValue, saving, message, error, save } = useSectionEditor("header", initial, onSaved);

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <p className={CARD_TITLE}>Navigation Links</p>
        <p className="font-mono text-[11px] text-[#ebbbb4]/40">
          The menu in the site header (also the mobile menu). Use the arrows to change the order.
        </p>
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

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Header" />
    </div>
  );
}
