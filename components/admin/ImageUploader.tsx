"use client";

import { useState } from "react";
import Image from "next/image";
import { LABEL } from "./formKit";

export default function ImageUploader({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed.");
      onChange(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-28 h-20 shrink-0 border border-[#603e39]/40 bg-[#0e0e0e] overflow-hidden relative">
          {value ? (
            <Image src={value} alt="" fill sizes="120px" className="object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#ebbbb4]/20">
              <span className="material-symbols-outlined text-[24px]">image</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <label
            className={`px-4 py-2 border border-[#603e39]/60 text-[#ebbbb4]/60 font-mono text-[10px] tracking-widest uppercase cursor-pointer hover:border-primary hover:text-primary transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {hint && <p className="mt-1.5 font-mono text-[10px] text-[#ebbbb4]/30">{hint}</p>}
      {error && <p className="mt-1 font-mono text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
