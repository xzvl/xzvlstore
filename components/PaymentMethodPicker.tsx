"use client";

import { useState } from "react";
import Image from "next/image";
import type { PaymentMethod } from "@/lib/site-content";
import { sizedImageUrl } from "@/lib/image-sizes";

// Storefront picker for the payment methods configured in /admin/content →
// Payment. Shows a radio-style button per method and, for the selected one,
// its QR code and account details so the customer can pay right away.
export default function PaymentMethodPicker({
  methods,
  value,
  onChange,
  proof,
}: {
  methods: PaymentMethod[];
  /** The selected method's id. */
  value: string;
  onChange: (id: string) => void;
  /** Shown to the right of the QR code and details, e.g. the proof-of-payment upload. */
  proof?: React.ReactNode;
}) {
  const selected = methods.find((m) => m.id === value) ?? null;

  return (
    <div className="space-y-4">
      {methods.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={`py-3 px-4 border font-mono text-[12px] tracking-wide text-left transition-all ${
                m.id === value ? "border-primary text-primary bg-primary/5" : "border-line/40 text-fg/50 hover:border-line"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full border flex-shrink-0 ${
                    m.id === value ? "border-primary bg-primary" : "border-line"
                  }`}
                />
                {m.company}
              </div>
            </button>
          ))}
        </div>
      )}
      {selected && <PaymentMethodDetails method={selected} proof={proof} />}
    </div>
  );
}

function PaymentMethodDetails({ method, proof }: { method: PaymentMethod; proof?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const hasDetails = method.accountName || method.accountNumber || method.qrCode;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(method.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className={`border border-line/40 bg-panel p-4 flex flex-col gap-4 ${proof ? "md:flex-row" : "sm:flex-row"}`}>
      {method.qrCode && (
        <a
          href={method.qrCode}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-48 mx-auto sm:mx-0 sm:w-40 aspect-square relative border border-line/30 bg-white flex-shrink-0 self-start"
          title="Open QR code"
        >
          <Image
            src={sizedImageUrl(method.qrCode, "medium") ?? method.qrCode}
            alt={`${method.company} QR code`}
            fill
            sizes="192px"
            className="object-contain"
            onError={(e) => {
              if (e.currentTarget.src !== method.qrCode) e.currentTarget.src = method.qrCode;
            }}
          />
        </a>
      )}
      <div className="flex-1 min-w-0 space-y-3">
        <div>
          <p className="font-mono text-[10px] tracking-widest uppercase text-accent/50 mb-0.5">Pay via</p>
          <p className="font-inter font-bold text-[16px] text-fg">{method.company}</p>
        </div>
        {method.accountName && (
          <div>
            <p className="font-mono text-[10px] tracking-widest uppercase text-accent/50 mb-0.5">Account Name</p>
            <p className="font-mono text-[13px] text-fg">{method.accountName}</p>
          </div>
        )}
        {method.accountNumber && (
          <div>
            <p className="font-mono text-[10px] tracking-widest uppercase text-accent/50 mb-0.5">Account Number</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-[13px] text-fg break-all">{method.accountNumber}</p>
              <button
                type="button"
                onClick={copy}
                className="flex-shrink-0 flex items-center gap-1 font-mono text-[10px] text-accent/50 hover:text-primary transition-colors"
                title="Copy account number"
              >
                <span className="material-symbols-outlined text-[14px]">{copied ? "check" : "content_copy"}</span>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
        {!hasDetails && (
          <p className="font-mono text-[11px] text-accent/40">Payment details will be sent after your order is confirmed.</p>
        )}
      </div>
      {proof && <div className="w-full md:w-60 flex-shrink-0">{proof}</div>}
    </div>
  );
}
