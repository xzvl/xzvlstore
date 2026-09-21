"use client";

import type { ReactNode } from "react";

// Editable, reorderable list of items (nav links, social links…). Each row gets
// move up/down + remove buttons; `renderItem` draws the item's own fields.
export default function ListEditor<T>({
  items,
  onChange,
  newItem,
  renderItem,
  itemLabel,
  minItems = 0,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  newItem: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  itemLabel: string;
  minItems?: number;
}) {
  const add = () => onChange([...items, newItem()]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<T>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const iconBtn =
    "w-7 h-7 flex items-center justify-center border border-[#603e39]/40 text-[#ebbbb4]/50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed";

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border border-[#603e39]/30 bg-[#131313] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] text-[#ebbbb4]/50 uppercase tracking-widest">
              {itemLabel} {i + 1}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className={`${iconBtn} hover:border-[#ebbbb4]/50 hover:text-[#e2e2e2]`}
                title="Move up"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                className={`${iconBtn} hover:border-[#ebbbb4]/50 hover:text-[#e2e2e2]`}
                title="Move down"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              </button>
              {items.length > minItems && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className={`${iconBtn} hover:border-red-500 hover:text-red-500`}
                  title="Remove"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              )}
            </div>
          </div>
          {renderItem(item, (patch) => update(i, patch))}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#603e39]/50 text-[#ebbbb4]/50 font-mono text-[10px] tracking-widest uppercase hover:border-primary hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-[14px]">add</span>
        Add {itemLabel}
      </button>
    </div>
  );
}
