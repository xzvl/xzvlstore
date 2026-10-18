"use client";

import dynamic from "next/dynamic";
import { newPaymentMethodId, type PaymentContent, type PaymentMethod } from "@/lib/site-content";
import { useSectionEditor } from "@/components/admin/useSectionEditor";
import { CARD, CARD_TITLE, INPUT, LABEL } from "@/components/admin/formKit";
import ImageUploader from "@/components/admin/ImageUploader";
import ListEditor from "@/components/admin/ListEditor";
import SaveBar from "@/components/admin/SaveBar";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="flex items-center gap-2 tabular-nums text-[10px] uppercase tracking-wider font-medium"
    >
      <span
        className={`relative w-10 h-5 border transition-colors ${
          on ? "bg-primary/20 border-primary" : "bg-fg/[0.05] border-line"
        }`}
      >
        <span
          className={`absolute top-0.5 w-[14px] h-[14px] transition-all ${on ? "left-[22px] bg-primary" : "left-0.5 bg-accent/40"}`}
        />
      </span>
      <span className={on ? "text-primary" : "text-accent/70"}>{label}</span>
    </button>
  );
}

export default function PaymentTab({
  initial,
  onSaved,
}: {
  initial: PaymentContent;
  onSaved: (v: PaymentContent) => void;
}) {
  const { value, setValue, saving, message, error, save } = useSectionEditor("payment", initial, onSaved);

  const setMethods = (methods: PaymentMethod[]) => setValue((v) => ({ ...v, methods }));
  const setPreOrder = (patch: Partial<PaymentContent["preOrder"]>) =>
    setValue((v) => ({ ...v, preOrder: { ...v.preOrder, ...patch } }));
  const makeDefault = (id: string) =>
    setMethods(value.methods.map((m) => ({ ...m, isDefault: m.id === id ? !m.isDefault : false })));

  const missingCompany = value.methods.some((m) => !m.company.trim());
  const defaultMethod = value.methods.find((m) => m.isDefault);

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <p className={CARD_TITLE}>Payment Methods</p>
        <p className="tabular-nums text-[11px] text-accent/60">
          Shown on the checkout page and on the pre-order form, in this order. Only enabled methods are shown to
          customers. The <span className="text-primary">default</span> method is pre-selected on the pre-order form
          when a product requires a down payment. QR code uploads are converted to WebP and resized automatically.
        </p>
        {defaultMethod && !defaultMethod.enabled && (
          <p className="flex items-center gap-1.5 tabular-nums text-[11px] text-orange-400">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            The default method ({defaultMethod.company || "unnamed"}) is disabled, so the first enabled method is used instead.
          </p>
        )}
        <ListEditor<PaymentMethod>
          items={value.methods}
          onChange={setMethods}
          itemLabel="Method"
          newItem={() => ({
            id: newPaymentMethodId(),
            enabled: true,
            isDefault: value.methods.length === 0,
            company: "",
            accountNumber: "",
            accountName: "",
            qrCode: "",
          })}
          renderItem={(item, update) => (
            <div className="space-y-4">
              <div className="flex items-center gap-5 flex-wrap">
                <Switch on={item.enabled} onClick={() => update({ enabled: !item.enabled })} label={item.enabled ? "Enabled" : "Disabled"} />
                <Switch on={item.isDefault} onClick={() => makeDefault(item.id)} label="Default" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={LABEL}>
                    Company <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={item.company}
                    onChange={(e) => update({ company: e.target.value })}
                    placeholder="e.g. GCash, BDO, Maya"
                    className={`${INPUT} ${item.company.trim() ? "" : "!border-primary"}`}
                  />
                </div>
                <div>
                  <label className={LABEL}>Account Number</label>
                  <input
                    value={item.accountNumber}
                    onChange={(e) => update({ accountNumber: e.target.value })}
                    placeholder="Optional"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Account Name</label>
                  <input
                    value={item.accountName}
                    onChange={(e) => update({ accountName: e.target.value })}
                    placeholder="Optional"
                    className={INPUT}
                  />
                </div>
              </div>
              <ImageUploader
                label="QR Code"
                hint="Optional. Upload a new image or pick one already in Supabase storage."
                value={item.qrCode}
                onChange={(qrCode) => update({ qrCode })}
              />
            </div>
          )}
        />
        {value.methods.length === 0 && (
          <p className="tabular-nums text-[11px] text-accent/50 italic">
            No payment methods yet. Until you add one, checkout shows the built-in list (GCash, Cash, Bank Transfer, Maya).
          </p>
        )}
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>Pre-Order</p>
        <p className="tabular-nums text-[11px] text-accent/60">
          Text shown on the <span className="text-primary">/pre-order</span> form, above the submit button.
        </p>
        <div>
          <label className={LABEL}>Policy Title</label>
          <input
            value={value.preOrder.policyTitle}
            onChange={(e) => setPreOrder({ policyTitle: e.target.value })}
            placeholder="Pre-Order Policy"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Policy</label>
          <RichTextEditor value={value.preOrder.policy} onChange={(policy) => setPreOrder({ policy })} />
          <p className="tabular-nums text-[11px] text-accent/50 mt-1.5">Leave empty to hide the policy box.</p>
        </div>
      </div>

      {missingCompany && (
        <p className="flex items-center gap-1.5 tabular-nums text-[11px] text-primary">
          <span className="material-symbols-outlined text-[14px]">error</span>
          Every payment method needs a company name.
        </p>
      )}
      <SaveBar saving={saving} message={message} error={error} onSave={save} label="Save Payment" />
    </div>
  );
}
