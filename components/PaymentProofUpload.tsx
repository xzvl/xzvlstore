"use client";

import { useEffect, useRef, useState } from "react";
import { verifyPayment, FLAG_LABELS, type PaymentExtraction } from "@/lib/payment-proof";

export type UploadedPaymentProof = {
  url: string;
  extraction: PaymentExtraction | null;
  duplicate: boolean;
};

// Required proof-of-payment dropzone for /checkout and /pre-order. The image is
// uploaded and read (OCR) right away so the customer can see what we found;
// the order route re-checks it when the order is placed.
export default function PaymentProofUpload({
  expectedAmount,
  value,
  onChange,
  error,
}: {
  /** What the customer should have paid (order total or down payment). */
  expectedAmount: number;
  value: UploadedPaymentProof | null;
  onChange: (proof: UploadedPaymentProof | null) => void;
  /** Validation message, e.g. when the order is submitted without a proof. */
  error?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const upload = async (files: FileList | null) => {
    const file = Array.from(files ?? []).find((f) => f.type.startsWith("image/"));
    if (!file) {
      setUploadError("Please choose an image (screenshot) of your payment.");
      return;
    }
    setUploadError("");
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    onChange(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/payment-proof", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed. Please try again.");
      onChange({ url: json.url, extraction: json.extraction ?? null, duplicate: !!json.duplicate });
    } catch (err) {
      setPreview(null);
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const check = value ? verifyPayment(value.extraction, expectedAmount, value.duplicate) : null;
  const shownError = uploadError || (!value && !uploading ? error : "");

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <p className="font-mono text-[10px] tracking-widest uppercase text-accent/50">
        Proof of Payment <span className="text-primary">*</span>
      </p>

      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && fileRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !uploading) { e.preventDefault(); fileRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!uploading) upload(e.dataTransfer.files); }}
        className={`relative flex flex-col items-center justify-center gap-1.5 min-h-[160px] p-3 border border-dashed text-center transition-colors ${
          uploading ? "cursor-wait" : "cursor-pointer"
        } ${
          dragOver ? "border-primary bg-primary/5"
            : shownError ? "border-primary"
            : "border-line/50 hover:border-primary"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Proof of payment" className={`max-h-[180px] max-w-full object-contain ${uploading ? "opacity-40" : ""}`} />
        ) : (
          <>
            <span className="material-symbols-outlined text-[28px] text-accent/40">add_photo_alternate</span>
            <span className="font-mono text-[11px] text-accent/60">Click or drop image here</span>
            <span className="font-mono text-[10px] text-accent/35">Screenshot of your payment receipt</span>
          </>
        )}
        {uploading && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-panel/60">
            <span className="material-symbols-outlined text-[22px] text-primary animate-spin">progress_activity</span>
            <span className="font-mono text-[10px] text-fg">Reading your receipt…</span>
          </span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { upload(e.target.files); e.target.value = ""; }}
        />
      </div>

      {preview && !uploading && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="self-start flex items-center gap-1 font-mono text-[10px] text-accent/50 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
          Replace image
        </button>
      )}

      {shownError && (
        <p className="font-mono text-[10px] text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">error</span>{shownError}
        </p>
      )}

      {check && (
        <div className={`border px-3 py-2 space-y-1 ${check.verified ? "border-green-400/40 bg-green-400/5" : "border-orange-400/40 bg-orange-400/5"}`}>
          <p className={`flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase ${check.verified ? "text-green-400" : "text-orange-400"}`}>
            <span className="material-symbols-outlined text-[14px]">{check.verified ? "verified" : "pending"}</span>
            {check.verified ? "Payment details matched" : "Needs manual review"}
          </p>
          <ProofRow label="Amount" value={check.amount != null ? `₱${check.amount.toLocaleString()}` : null}
            ok={!check.flags.includes("amount_mismatch") && !check.flags.includes("amount_not_found")} />
          <ProofRow label="Ref No." value={check.reference}
            ok={!check.flags.includes("reference_not_found") && !check.flags.includes("duplicate_reference")} />
          {!check.verified && (
            <ul className="pt-1 space-y-0.5">
              {check.flags.map((f) => (
                <li key={f} className="font-mono text-[10px] text-orange-400/90">
                  • {f === "amount_mismatch" ? `${FLAG_LABELS[f]} — expected ₱${expectedAmount.toLocaleString()}` : FLAG_LABELS[f]}
                </li>
              ))}
              <li className="font-mono text-[10px] text-accent/50 pt-0.5">
                You can still place the order — we&apos;ll check your payment manually.
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ProofRow({ label, value, ok }: { label: string; value: string | null; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
      <span className="text-accent/50">{label}</span>
      <span className={`flex items-center gap-1 truncate ${ok ? "text-fg" : "text-orange-400"}`}>
        {value ?? "—"}
        <span className="material-symbols-outlined text-[13px]">{ok ? "check" : "close"}</span>
      </span>
    </div>
  );
}
