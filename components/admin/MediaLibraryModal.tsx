"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { sizedImageUrl } from "@/lib/image-sizes";

type MediaRow = { base: string; originalUrl: string | null };

export default function MediaLibraryModal({
  multiple = false,
  onClose,
  onSelect,
}: {
  /** false (default) = clicking an image selects it immediately and closes. true = checkbox grid + a confirm button. */
  multiple?: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
}) {
  const [rows, setRows] = useState<MediaRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/image-optimizer", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((json) => setRows(json.rows))
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleFiles(files: FileList) {
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) continue;
        if (!multiple) {
          onSelect([json.url]);
          return;
        }
        setRows((prev) => [{ base: json.url, originalUrl: json.url }, ...(prev ?? [])]);
        setSelected((prev) => new Set(prev).add(json.url));
      } catch {
        // skip this file, keep going
      }
    }
    setUploading(false);
  }

  function pick(url: string) {
    if (!multiple) {
      onSelect([url]);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-[#1a1a1a] border border-[#603e39]/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#603e39]/30 px-5 py-3 flex-shrink-0">
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
            Media Library{multiple ? " — Select Multiple" : ""}
          </p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-[#ebbbb4]/40 hover:text-primary transition-colors" title="Close">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Upload row */}
        <div className="px-5 pt-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#603e39]/50 hover:border-primary text-[#ebbbb4]/50 hover:text-primary font-mono text-[11px] tracking-widest uppercase transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">upload</span>
            )}
            {uploading ? "Uploading…" : "Upload New Image"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {loadError ? (
            <p className="font-mono text-[12px] text-primary py-8 text-center">Failed to load the media library.</p>
          ) : !rows ? (
            <div className="flex items-center justify-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-12">
              <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="font-mono text-[12px] text-[#ebbbb4]/30 py-12 text-center">No images yet — upload one above.</p>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}>
              {rows.map((row) => {
                if (!row.originalUrl) return null;
                const isSelected = selected.has(row.originalUrl);
                return (
                  <button
                    key={row.base}
                    type="button"
                    onClick={() => pick(row.originalUrl!)}
                    className={`relative w-[100px] h-[100px] bg-[#0e0e0e] border overflow-hidden transition-colors ${
                      isSelected ? "border-primary" : "border-[#603e39]/30 hover:border-[#ebbbb4]/40"
                    }`}
                  >
                    <Image
                      src={sizedImageUrl(row.originalUrl, "thumbnail") ?? row.originalUrl}
                      alt=""
                      fill
                      sizes="100px"
                      className="object-cover"
                      onError={(e) => {
                        if (e.currentTarget.src !== row.originalUrl) e.currentTarget.src = row.originalUrl!;
                      }}
                    />
                    {multiple && (
                      <div
                        className={`absolute top-1 right-1 w-5 h-5 flex items-center justify-center border ${
                          isSelected ? "bg-primary border-primary" : "bg-black/50 border-white/40"
                        }`}
                      >
                        {isSelected && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {multiple && (
          <div className="flex items-center justify-end gap-2 border-t border-[#603e39]/30 px-5 py-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-mono text-[11px] tracking-widest uppercase text-[#ebbbb4]/40 hover:text-[#e2e2e2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => onSelect(Array.from(selected))}
              className="px-5 py-2 bg-primary text-white font-mono text-[11px] tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add Selected ({selected.size})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
