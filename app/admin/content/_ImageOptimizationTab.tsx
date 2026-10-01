"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CARD, CARD_TITLE } from "@/components/admin/formKit";
import { sizedImageUrl } from "@/lib/image-sizes";

type ImageRow = {
  base: string;
  originalName: string | null;
  originalExt: string | null;
  originalUrl: string | null;
  sizeBytes: number;
  hasSmall: boolean;
  hasThumbnail: boolean;
  hasMedium: boolean;
  hasLarge: boolean;
  optimized: boolean;
};

type Filter = "all" | "unoptimized" | "optimized";

type OptimizeResult = { base: string; status: "optimized" | "skipped" | "error"; message?: string };

const SIZE_PIPS: { key: keyof Pick<ImageRow, "hasSmall" | "hasThumbnail" | "hasMedium" | "hasLarge">; label: string }[] = [
  { key: "hasSmall", label: "S" },
  { key: "hasThumbnail", label: "T" },
  { key: "hasMedium", label: "M" },
  { key: "hasLarge", label: "L" },
];

const CONCURRENCY = 3;
const HIGHLIGHT_MS = 1400;

function formatBytes(n: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function toWebpOriginal(url: string) {
  return url.replace(/\.[a-z0-9]+$/i, ".webp");
}

export default function ImageOptimizationTab() {
  const [rows, setRows] = useState<ImageRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<Filter>("unoptimized");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPopup, setShowPopup] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [justDone, setJustDone] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Map<string, string>>(new Map());
  const [summary, setSummary] = useState<{ optimized: number; skipped: number; error: number; errors: string[] } | null>(null);

  function load() {
    setLoadError(false);
    fetch("/api/admin/image-optimizer", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((json) => setRows(json.rows))
      .catch(() => setLoadError(true));
  }

  useEffect(load, []);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    if (filter === "unoptimized") return rows.filter((r) => !r.optimized);
    if (filter === "optimized") return rows.filter((r) => r.optimized);
    return rows;
  }, [rows, filter]);

  const allFilteredSelected = filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.base));

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const r of filteredRows) next.delete(r.base);
      } else {
        for (const r of filteredRows) next.add(r.base);
      }
      return next;
    });
  }

  function toggleRow(base: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(base)) next.delete(base);
      else next.add(base);
      return next;
    });
  }

  function applyOptimizedPatch(base: string) {
    setRows((prev) =>
      prev
        ? prev.map((r) =>
            r.base === base
              ? {
                  ...r,
                  originalExt: "webp",
                  originalUrl: !r.originalUrl || r.originalExt === "webp" ? r.originalUrl : toWebpOriginal(r.originalUrl),
                  hasSmall: true,
                  hasThumbnail: true,
                  hasMedium: true,
                  hasLarge: true,
                  optimized: true,
                }
              : r
          )
        : prev
    );
  }

  async function runOptimize(deleteOriginals: boolean) {
    setShowPopup(false);
    const bases = Array.from(selected);
    if (bases.length === 0) return;

    setRunning(true);
    setSummary(null);
    setRowErrors(new Map());
    setProgress({ done: 0, total: bases.length });

    const results: OptimizeResult[] = [];
    let doneCount = 0;
    let index = 0;

    async function worker() {
      while (index < bases.length) {
        const base = bases[index++];
        setProcessing((prev) => new Set(prev).add(base));
        let result: OptimizeResult;
        try {
          const res = await fetch("/api/admin/image-optimizer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bases: [base], deleteOriginals }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Failed.");
          result = (json.results as OptimizeResult[])[0] ?? { base, status: "error", message: "No result returned." };
        } catch (err) {
          result = { base, status: "error", message: err instanceof Error ? err.message : "Failed." };
        }
        results.push(result);
        if (result.status === "error") {
          setRowErrors((prev) => new Map(prev).set(base, result.message ?? "Failed."));
        } else {
          applyOptimizedPatch(base);
        }
        setProcessing((prev) => {
          const next = new Set(prev);
          next.delete(base);
          return next;
        });
        setJustDone((prev) => new Set(prev).add(base));
        setTimeout(() => {
          setJustDone((prev) => {
            const next = new Set(prev);
            next.delete(base);
            return next;
          });
        }, HIGHLIGHT_MS);
        doneCount++;
        setProgress({ done: doneCount, total: bases.length });
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, bases.length) }, worker));

    setSummary({
      optimized: results.filter((r) => r.status === "optimized").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      error: results.filter((r) => r.status === "error").length,
      errors: results.filter((r) => r.status === "error").map((r) => `${r.base}: ${r.message ?? "failed"}`),
    });
    setSelected(new Set());
    setRunning(false);
    setProgress(null);
    load();
  }

  if (loadError) {
    return <p className="font-mono text-[12px] text-primary py-8">Failed to load images from storage.</p>;
  }

  if (!rows) {
    return (
      <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-8">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading images…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className={CARD_TITLE}>Image Optimization</p>
            <p className="font-mono text-[11px] text-[#ebbbb4]/40 mt-1">
              Backfills WebP + 4 size variants (small/thumbnail/medium/large) for images uploaded before the
              optimization pipeline existed. &quot;Optimized&quot; means the original is WebP and all 4 sizes exist.
            </p>
          </div>
          <div className="flex items-center gap-1">
            {(["all", "unoptimized", "optimized"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase border transition-colors capitalize ${
                  filter === f
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-[#603e39]/40 text-[#ebbbb4]/40 hover:border-[#ebbbb4]/30 hover:text-[#ebbbb4]/70"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {running && progress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px] text-[#ebbbb4]/50">
              <span>Optimizing {progress.done} / {progress.total}…</span>
              <span>{Math.round((progress.done / progress.total) * 100)}%</span>
            </div>
            <div className="h-1 w-full bg-[#1f1f1f] overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {summary && (
          <div className="border border-[#603e39]/40 bg-[#0e0e0e] px-4 py-3 space-y-1">
            <p className="font-mono text-[11px] text-[#e2e2e2]">
              <span className="text-green-400">{summary.optimized} optimized</span>
              {" · "}
              <span className="text-[#ebbbb4]/50">{summary.skipped} skipped</span>
              {summary.error > 0 && <> · <span className="text-primary">{summary.error} failed</span></>}
            </p>
            {summary.errors.map((e, i) => (
              <p key={i} className="font-mono text-[10px] text-primary/80">{e}</p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-b border-[#603e39]/30 pb-2">
          <label className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase text-[#ebbbb4]/60 cursor-pointer">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              disabled={running}
              style={{ accentColor: "#ed0d11" }}
              className="w-3.5 h-3.5"
            />
            Select All ({filteredRows.length})
          </label>
          <button
            type="button"
            disabled={selected.size === 0 || running}
            onClick={() => setShowPopup(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-mono text-[10px] tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
            {running && progress ? `Optimizing ${progress.done}/${progress.total}…` : `Optimize Selected (${selected.size})`}
          </button>
        </div>

        <div className="space-y-1.5 max-h-[520px] overflow-y-auto">
          {filteredRows.length === 0 ? (
            <p className="font-mono text-[11px] text-[#ebbbb4]/30 py-6 text-center">No images match this filter.</p>
          ) : (
            filteredRows.map((row) => {
              const isProcessing = processing.has(row.base);
              const isJustDone = justDone.has(row.base);
              const rowError = rowErrors.get(row.base);
              return (
                <div
                  key={row.base}
                  className={`relative flex items-center gap-3 border px-3 py-2 overflow-hidden transition-colors duration-700 ${
                    isJustDone
                      ? "border-green-400/50 bg-green-400/5"
                      : rowError
                      ? "border-primary/40 bg-primary/5"
                      : "border-[#603e39]/25 bg-[#0e0e0e]"
                  }`}
                >
                  {isProcessing && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-pulse" />
                  )}
                  <input
                    type="checkbox"
                    checked={selected.has(row.base)}
                    onChange={() => toggleRow(row.base)}
                    disabled={running}
                    style={{ accentColor: "#ed0d11" }}
                    className="w-3.5 h-3.5 flex-shrink-0"
                  />
                  <div className="relative w-10 h-10 flex-shrink-0 bg-[#111] border border-[#603e39]/20 overflow-hidden">
                    {row.originalUrl ? (
                      <Image
                        src={sizedImageUrl(row.originalUrl, "thumbnail") ?? row.originalUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                        onError={(e) => {
                          if (e.currentTarget.src !== row.originalUrl) e.currentTarget.src = row.originalUrl!;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] text-[#ebbbb4]/20">broken_image</span>
                      </div>
                    )}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="material-symbols-outlined animate-spin text-[16px] text-primary">progress_activity</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[11px] text-[#e2e2e2] truncate">{row.base}</p>
                    <p className="font-mono text-[10px] text-[#ebbbb4]/30">
                      {rowError ? <span className="text-primary">{rowError}</span> : formatBytes(row.sizeBytes)}
                    </p>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 font-mono text-[9px] tracking-widest uppercase border flex-shrink-0 transition-colors duration-700 ${
                      row.originalExt === "webp"
                        ? `border-green-400/40 text-green-400 ${isJustDone ? "bg-green-400/20" : ""}`
                        : "border-[#603e39]/40 text-[#ebbbb4]/40"
                    }`}
                  >
                    {row.originalExt ?? "—"}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {SIZE_PIPS.map((p) => (
                      <span
                        key={p.key}
                        title={p.key}
                        className={`w-5 h-5 flex items-center justify-center font-mono text-[9px] border transition-colors duration-700 ${
                          row[p.key]
                            ? `border-green-400/40 text-green-400 ${isJustDone ? "bg-green-400/20" : ""}`
                            : "border-[#603e39]/30 text-[#ebbbb4]/20"
                        }`}
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                  <span className="w-5 flex-shrink-0 flex items-center justify-center">
                    {isProcessing ? (
                      <span className="material-symbols-outlined animate-spin text-[18px] text-primary">progress_activity</span>
                    ) : rowError ? (
                      <span className="material-symbols-outlined text-[18px] text-primary" title={rowError}>error</span>
                    ) : row.optimized ? (
                      <span className={`material-symbols-outlined text-[18px] text-green-400 transition-transform duration-500 ${isJustDone ? "scale-125" : ""}`}>
                        check_circle
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px] text-[#ebbbb4]/15">radio_button_unchecked</span>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="w-full max-w-sm bg-[#1a1a1a] border border-[#603e39]/40 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-1">Before optimizing</p>
              <p className="font-mono text-[12px] text-[#e2e2e2]">
                Delete the original jpg/png/other-format files once their WebP replacement is ready?
              </p>
              <p className="font-mono text-[10px] text-[#ebbbb4]/40 mt-1.5">
                Keeping them uses more storage but is safer; deleting frees up space immediately.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => runOptimize(false)}
                className="w-full py-2.5 border border-[#603e39]/60 text-[#e2e2e2] font-mono text-[11px] tracking-widest uppercase hover:border-primary hover:text-primary transition-colors"
              >
                Keep Originals
              </button>
              <button
                type="button"
                onClick={() => runOptimize(true)}
                className="w-full py-2.5 bg-primary text-white font-mono text-[11px] tracking-widest uppercase hover:brightness-110 transition-all"
              >
                Delete Originals
              </button>
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="w-full py-2 text-[#ebbbb4]/40 font-mono text-[10px] tracking-widest uppercase hover:text-[#e2e2e2] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
