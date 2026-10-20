"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { OrderProofImage, OrderProofType } from "@/lib/supabase";
import { sizedImageUrl } from "@/lib/image-sizes";
import type { PaymentExtraction } from "@/lib/payment-proof";

const TYPES: { value: OrderProofType; label: string; active: string }[] = [
  { value: "payment", label: "Payment", active: "border-green-400/60 bg-green-400/10 text-green-400" },
  { value: "purchase", label: "Purchase", active: "border-sky-400/60 bg-sky-400/10 text-sky-400" },
];

const typeLabel = (t: OrderProofType) => TYPES.find((x) => x.value === t)?.label ?? t;

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
  });
}

function TypeToggle({ value, onChange, size = "sm" }: { value: OrderProofType; onChange: (t: OrderProofType) => void; size?: "sm" | "md" }) {
  return (
    <div className="flex gap-1">
      {TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={`flex-1 border rounded tabular-nums uppercase tracking-wider font-medium transition-colors ${
            size === "sm" ? "text-[9px] px-1.5 py-1" : "text-[10px] px-3 py-1.5"
          } ${value === t.value ? t.active : "border-line/40 text-accent/60 hover:text-fg"}`}
        >
          {size === "sm" ? t.value : t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Proof of payment / proof of purchase screenshots for an order. Images upload
 * straight away; the list itself is saved with the rest of the order form.
 */
export default function OrderProofs({
  value,
  onChange,
  onPaymentRead,
}: {
  value: OrderProofImage[];
  onChange: (next: OrderProofImage[] | ((prev: OrderProofImage[]) => OrderProofImage[])) => void;
  /** Called with what OCR read off each uploaded payment screenshot. */
  onPaymentRead?: (extraction: PaymentExtraction | null, duplicate: boolean) => void;
}) {
  const [uploadType, setUploadType] = useState<OrderProofType>("payment");
  const [uploading, setUploading] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[]) => {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setFailed([]);
    setUploading((n) => n + images.length);
    const type = uploadType;
    await Promise.all(
      images.map(async (file) => {
        try {
          const fd = new FormData();
          fd.append("file", file);
          // Payment screenshots go through the same endpoint as /checkout and
          // /pre-order so they're read (OCR) and checked the same way.
          if (type !== "payment") fd.append("folder", "order-proofs");
          const res = await fetch(type === "payment" ? "/api/payment-proof" : "/api/admin/upload", { method: "POST", body: fd });
          const json = await res.json();
          if (!res.ok || !json.url) throw new Error();
          onChange((prev) => [...prev, { url: json.url, type, uploaded_at: new Date().toISOString() }]);
          if (type === "payment") onPaymentRead?.(json.extraction ?? null, !!json.duplicate);
        } catch {
          setFailed((prev) => [...prev, file.name]);
        } finally {
          setUploading((n) => n - 1);
        }
      })
    );
  };

  const setType = (i: number, type: OrderProofType) =>
    onChange((prev) => prev.map((p, idx) => (idx === i ? { ...p, type } : p)));

  const remove = (i: number) => {
    if (!confirm("Remove this image from the order?")) return;
    onChange((prev) => prev.filter((_, idx) => idx !== i));
  };

  const counts = TYPES.map((t) => ({ ...t, count: value.filter((p) => p.type === t.value).length }));

  return (
    <div className="bg-panel border border-line/30 p-5 space-y-4 rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="tabular-nums text-[13px] font-semibold text-fg">Proof of Payment / Purchase</p>
        <div className="flex gap-3 tabular-nums text-[10px] text-accent/60">
          {counts.map((c) => (
            <span key={c.value}>{c.label}: <span className="text-fg font-semibold">{c.count}</span></span>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular-nums text-[10px] uppercase text-accent/60 tracking-wider font-medium">Upload as</span>
          <TypeToggle value={uploadType} onChange={setUploadType} size="md" />
        </div>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
          className={`flex flex-col items-center justify-center gap-1 py-6 border border-dashed rounded-md cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-line/50 hover:border-primary"
          }`}
        >
          <span className={`material-symbols-outlined text-[24px] text-accent/50 ${uploading ? "animate-spin" : ""}`}>
            {uploading ? "progress_activity" : "add_photo_alternate"}
          </span>
          <span className="tabular-nums text-[11px] text-accent/60">
            {uploading ? `Uploading ${uploading} image${uploading === 1 ? "" : "s"}${uploadType === "payment" ? " and reading payment details" : ""}…` : "Click or drop images here — you can pick several at once"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ""; }}
          />
        </div>
        {failed.length > 0 && (
          <p className="tabular-nums text-[11px] text-red-400">Couldn&apos;t upload: {failed.join(", ")}</p>
        )}
      </div>

      {/* Images */}
      {value.length === 0 ? (
        <p className="tabular-nums text-[11px] text-accent/50 italic">No images yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {value.map((p, i) => (
            <div key={`${p.url}-${i}`} className="border border-line/30 rounded-md overflow-hidden bg-deep">
              <button
                type="button"
                onClick={() => setViewing(i)}
                className="relative block w-full aspect-square bg-canvas group"
                title="View full size"
              >
                <Image
                  src={sizedImageUrl(p.url, "thumbnail") ?? p.url}
                  alt={typeLabel(p.type)}
                  fill
                  sizes="200px"
                  className="object-cover"
                  onError={(e) => { if (e.currentTarget.src !== p.url) e.currentTarget.src = p.url; }}
                />
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[22px]">zoom_in</span>
                </span>
              </button>
              <div className="p-2 space-y-1.5">
                <TypeToggle value={p.type} onChange={(t) => setType(i, t)} />
                <div className="flex items-center justify-between gap-1">
                  <span className="tabular-nums text-[9px] text-accent/50 truncate">{formatDate(p.uploaded_at)}</span>
                  <button type="button" onClick={() => remove(i)} className="text-accent/50 hover:text-red-400 transition-colors" title="Remove">
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="tabular-nums text-[10px] text-accent/50">
        Images upload right away, but changes to this list are only kept when you save the order.
      </p>

      {viewing !== null && value[viewing] && (
        <ProofViewer
          proofs={value}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function ProofViewer({
  proofs,
  index,
  onIndex,
  onClose,
}: {
  proofs: OrderProofImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const p = proofs[index];
  const prev = () => onIndex((index - 1 + proofs.length) % proofs.length);
  const next = () => onIndex((index + 1) % proofs.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="tabular-nums text-[12px]">
          {typeLabel(p.type)} · {index + 1} / {proofs.length}
          <span className="text-white/50 ml-2">{formatDate(p.uploaded_at)}</span>
        </p>
        <div className="flex items-center gap-3">
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 tabular-nums text-[11px] text-white/70 hover:text-white">
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Open original
          </a>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white" title="Close">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
      </div>
      <div className="relative flex-1 flex items-center justify-center px-4 pb-4">
        {proofs.length > 1 && (
          <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-2 z-10 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.url}
          alt={typeLabel(p.type)}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-[calc(100vh-6rem)] object-contain"
        />
        {proofs.length > 1 && (
          <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-2 z-10 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        )}
      </div>
    </div>
  );
}
