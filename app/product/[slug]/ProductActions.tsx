"use client";

import { useListToggle } from "./useListToggle";

export function HeartButton({ productId }: { productId: string }) {
  const { active, count, busy, error, toggle } = useListToggle("favorites", productId);
  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={active}
        aria-label={active ? "Remove from favorites" : "Add to favorites"}
        title={active ? "Remove from favorites" : "Add to favorites"}
        className={`flex items-center gap-1.5 px-2 transition-colors disabled:opacity-60 ${
          active ? "text-primary" : "text-fg/50 hover:text-primary"
        }`}
      >
        <span
          className="material-symbols-outlined text-[18px]"
          style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}
        >
          favorite
        </span>
        <span className="font-mono text-[11px] tabular-nums">{count}</span>
      </button>
      {error && <p className="font-mono text-[10px] text-red-400 mt-1 text-right">{error}</p>}
    </div>
  );
}

export function WaitlistButton({ productId, label }: { productId: string; label: string }) {
  const { active, busy, error, toggle } = useListToggle("waitlist", productId);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={active}
        className={`w-full py-4 font-mono text-[12px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 disabled:opacity-60 ${
          active
            ? "bg-panel border border-sky-400 text-sky-400"
            : "bg-sky-500 text-white hover:brightness-110 active:scale-[0.98]"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">{active ? "check" : "notifications"}</span>
        {active ? "On the Waitlist" : label}
      </button>
      {active && (
        <p className="font-mono text-[10px] text-accent/40 tracking-wide">Tap again to leave the waitlist.</p>
      )}
      {error && <p className="font-mono text-[11px] text-red-400 tracking-wide">{error}</p>}
    </div>
  );
}
