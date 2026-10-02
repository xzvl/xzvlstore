"use client";

import { useEffect, useState } from "react";
import type { PosContent, PosBrandFilter, PosCategoryNavItem } from "@/lib/site-content";
import { DEFAULT_CATEGORY_ICON } from "@/lib/site-content";
import type { Taxonomy } from "@/lib/supabase";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE, INPUT, LABEL } from "@/components/admin/formKit";
import ListEditor from "@/components/admin/ListEditor";
import SaveBar from "@/components/admin/SaveBar";

const SELECT =
  "w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors";

const TYPE_LABEL: Record<Taxonomy["type"], string> = { brand: "Brand", category: "Category", tag: "Tag" };

export default function PosTab({
  initial,
  onSaved,
}: {
  initial: PosContent;
  onSaved: (v: PosContent) => void;
}) {
  const { value, setValue, saving, message, error, save } = useSectionEditor("pos", initial, onSaved);
  const [taxonomy, setTaxonomy] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/taxonomy")
      .then((r) => r.json())
      .then((data: Taxonomy[]) => setTaxonomy(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const entryName = (id: string) => {
    const t = taxonomy.find((x) => x.id === id);
    return t ? `${t.name} (${TYPE_LABEL[t.type]})` : "";
  };

  const unusedFor = (usedIds: string[]) => taxonomy.filter((t) => !usedIds.includes(t.id));

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-8">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading…
      </div>
    );
  }

  const TaxonomySelect = ({ value: id, onChange }: { value: string; onChange: (id: string) => void }) => (
    <select value={id} onChange={(e) => onChange(e.target.value)} className={SELECT}>
      {!entryName(id) && <option value={id}>— Unknown entry —</option>}
      {(["brand", "category", "tag"] as const).map((type) => {
        const entries = taxonomy.filter((t) => t.type === type);
        if (entries.length === 0) return null;
        return (
          <optgroup key={type} label={TYPE_LABEL[type] + "s"}>
            {entries.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <p className={CARD_TITLE}>Brand Quick Filters</p>
        <p className="font-mono text-[11px] text-[#ebbbb4]/40">
          Filter chips shown at the top of the Point of Sale product grid, in this order, alongside &quot;All&quot;.
          Pick any brand, category or tag — e.g. &quot;Takara Tomy&quot;, &quot;Hasbro&quot;, &quot;Pop!&quot;.
          Leave empty to show every brand automatically.
        </p>
        {taxonomy.length === 0 ? (
          <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">
            Nothing in Taxonomy yet — add some brands, categories or tags first.
          </p>
        ) : (
          <ListEditor<PosBrandFilter>
            items={value.brandFilters}
            onChange={(brandFilters) => setValue((v) => ({ ...v, brandFilters }))}
            itemLabel="Filter"
            newItem={() => ({ taxonomyId: unusedFor(value.brandFilters.map((f) => f.taxonomyId))[0]?.id ?? taxonomy[0].id })}
            renderItem={(item, update) => (
              <div>
                <label className={LABEL}>Brand / Category / Tag</label>
                <TaxonomySelect value={item.taxonomyId} onChange={(taxonomyId) => update({ taxonomyId })} />
              </div>
            )}
          />
        )}
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Category Side Navigation</p>
        <p className="font-mono text-[11px] text-[#ebbbb4]/40">
          Entries shown as icons in the Point of Sale side navigation, in this order, alongside &quot;All&quot;.
          Pick any brand, category or tag — e.g. &quot;BX&quot;, &quot;UX&quot;, &quot;CX&quot;, &quot;Attack&quot;, &quot;Balance&quot;, &quot;Defence&quot;, &quot;Stamina&quot;.
          Icon names come from{" "}
          <a href="https://fonts.google.com/icons" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Google&apos;s Material Symbols
          </a>{" "}
          (e.g. <code>bolt</code>, <code>shield</code>, <code>timer</code>, <code>balance</code>). Leave empty to show every category automatically.
        </p>
        {taxonomy.length === 0 ? (
          <p className="font-mono text-[11px] text-[#ebbbb4]/30 italic">
            Nothing in Taxonomy yet — add some brands, categories or tags first.
          </p>
        ) : (
          <ListEditor<PosCategoryNavItem>
            items={value.categoryNav}
            onChange={(categoryNav) => setValue((v) => ({ ...v, categoryNav }))}
            itemLabel="Entry"
            newItem={() => ({
              taxonomyId: unusedFor(value.categoryNav.map((n) => n.taxonomyId))[0]?.id ?? taxonomy[0].id,
              icon: DEFAULT_CATEGORY_ICON,
            })}
            renderItem={(item, update) => (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className={LABEL}>Brand / Category / Tag</label>
                  <TaxonomySelect value={item.taxonomyId} onChange={(taxonomyId) => update({ taxonomyId })} />
                </div>
                <div>
                  <label className={LABEL}>Icon name</label>
                  <input
                    value={item.icon}
                    onChange={(e) => update({ icon: e.target.value.trim().toLowerCase() })}
                    placeholder={DEFAULT_CATEGORY_ICON}
                    className={INPUT}
                  />
                </div>
                <div className="w-11 h-11 flex items-center justify-center border border-[#603e39]/40 bg-[#0e0e0e] flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px] text-primary">{item.icon || DEFAULT_CATEGORY_ICON}</span>
                </div>
              </div>
            )}
          />
        )}
      </div>

      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Point of Sale" />
    </div>
  );
}
