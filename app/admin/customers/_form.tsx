"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INPUT = "w-full bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20";
const LABEL = "block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5";

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  twitter_url: string;
  billing_address_1: string;
  billing_address_2: string;
  billing_city: string;
  billing_state: string;
  billing_postcode: string;
  billing_region: string;
  billing_phone: string;
  shipping_address_1: string;
  shipping_address_2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postcode: string;
  shipping_region: string;
  shipping_phone: string;
};

const EMPTY: FormState = {
  first_name: "", last_name: "", email: "", password: "",
  facebook_url: "", instagram_url: "", tiktok_url: "", twitter_url: "",
  billing_address_1: "", billing_address_2: "", billing_city: "", billing_state: "",
  billing_postcode: "", billing_region: "Philippines", billing_phone: "",
  shipping_address_1: "", shipping_address_2: "", shipping_city: "", shipping_state: "",
  shipping_postcode: "", shipping_region: "Philippines", shipping_phone: "",
};

function AddressBlock({
  title,
  prefix,
  form,
  set$,
  extra,
}: {
  title: string;
  prefix: "billing" | "shipping";
  form: FormState;
  set$: (k: keyof FormState, v: string) => void;
  extra?: React.ReactNode;
}) {
  const f = (field: string) => `${prefix}_${field}` as keyof FormState;
  return (
    <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">{title}</p>
        {extra}
      </div>
      <div>
        <label className={LABEL}>Address Line 1</label>
        <input value={String(form[f("address_1")])} onChange={e => set$(f("address_1"), e.target.value)} placeholder="Street address" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Address Line 2</label>
        <input value={String(form[f("address_2")])} onChange={e => set$(f("address_2"), e.target.value)} placeholder="Apt, unit, floor (optional)" className={INPUT} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>City</label>
          <input value={String(form[f("city")])} onChange={e => set$(f("city"), e.target.value)} placeholder="City" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>State / Province</label>
          <input value={String(form[f("state")])} onChange={e => set$(f("state"), e.target.value)} placeholder="Province" className={INPUT} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Postcode</label>
          <input value={String(form[f("postcode")])} onChange={e => set$(f("postcode"), e.target.value)} placeholder="0000" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Region</label>
          <input value={String(form[f("region")])} onChange={e => set$(f("region"), e.target.value)} placeholder="Philippines" className={INPUT} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Phone</label>
        <input value={String(form[f("phone")])} onChange={e => set$(f("phone"), e.target.value)} placeholder="+63 9XX XXX XXXX" className={INPUT} />
      </div>
    </div>
  );
}

export default function CustomerForm({ customerId }: { customerId?: string }) {
  const router = useRouter();
  const isNew = !customerId;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    fetch(`/api/admin/customers/${customerId}`)
      .then(r => r.json())
      .then(data => {
        setForm({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          email: data.email ?? "",
          password: "",
          facebook_url: data.facebook_url ?? "",
          instagram_url: data.instagram_url ?? "",
          tiktok_url: data.tiktok_url ?? "",
          twitter_url: data.twitter_url ?? "",
          billing_address_1: data.billing_address_1 ?? "",
          billing_address_2: data.billing_address_2 ?? "",
          billing_city: data.billing_city ?? "",
          billing_state: data.billing_state ?? "",
          billing_postcode: data.billing_postcode ?? "",
          billing_region: data.billing_region || "Philippines",
          billing_phone: data.billing_phone ?? "",
          shipping_address_1: data.shipping_address_1 ?? "",
          shipping_address_2: data.shipping_address_2 ?? "",
          shipping_city: data.shipping_city ?? "",
          shipping_state: data.shipping_state ?? "",
          shipping_postcode: data.shipping_postcode ?? "",
          shipping_region: data.shipping_region || "Philippines",
          shipping_phone: data.shipping_phone ?? "",
        });
        setLoading(false);
      });
  }, [customerId]);

  const set$ = (key: keyof FormState, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const copyBillingToShipping = () =>
    setForm(f => ({
      ...f,
      shipping_address_1: f.billing_address_1,
      shipping_address_2: f.billing_address_2,
      shipping_city: f.billing_city,
      shipping_state: f.billing_state,
      shipping_postcode: f.billing_postcode,
      shipping_region: f.billing_region,
      shipping_phone: f.billing_phone,
    }));

  const save = async () => {
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (isNew && !form.password.trim()) { setError("Password is required."); return; }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string> = { ...form };
      if (!isNew) delete payload.password;

      const res = await fetch(
        isNew ? "/api/admin/customers" : `/api/admin/customers/${customerId}`,
        { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      router.push("/admin/customers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-12">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/customers" className="inline-flex items-center gap-1 font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors mb-3">
            <span className="material-symbols-outlined text-[13px]">arrow_back</span>
            Back to Customers
          </Link>
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
            ADMIN // CUSTOMERS / {isNew ? "NEW" : "EDIT"}
          </p>
          <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">
            {isNew ? "New Customer" : `${form.first_name} ${form.last_name}`.trim() || "Edit Customer"}
          </h1>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/20 transition-colors disabled:opacity-50 flex-shrink-0 mt-8"
        >
          {saving
            ? <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
            : <span className="material-symbols-outlined text-[14px]">save</span>
          }
          {saving ? "Saving…" : "Save Customer"}
        </button>
      </div>

      {/* Personal info */}
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5 space-y-4">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Personal Information</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>First Name</label>
            <input value={form.first_name} onChange={e => set$("first_name", e.target.value)} placeholder="Juan" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Last Name</label>
            <input value={form.last_name} onChange={e => set$("last_name", e.target.value)} placeholder="dela Cruz" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Email <span className="text-primary">*</span></label>
            <input
              type="email"
              value={form.email}
              onChange={e => set$("email", e.target.value)}
              placeholder="juan@example.com"
              className={INPUT}
            />
          </div>
          {isNew && (
            <div>
              <label className={LABEL}>Password <span className="text-primary">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => set$("password", e.target.value)}
                  placeholder="Min. 6 characters"
                  className={`${INPUT} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ebbbb4]/30 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Billing & Shipping */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AddressBlock title="Billing Address" prefix="billing" form={form} set$={set$} />
        <AddressBlock
          title="Shipping Address"
          prefix="shipping"
          form={form}
          set$={set$}
          extra={
            <button
              type="button"
              onClick={copyBillingToShipping}
              className="flex items-center gap-1 font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[12px]">content_copy</span>
              Same as billing
            </button>
          }
        />
      </div>

      {/* Social Media */}
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-5 space-y-3">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Social Media</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: "facebook_url" as keyof FormState, label: "Facebook", placeholder: "https://facebook.com/username", icon: "group" },
            { key: "instagram_url" as keyof FormState, label: "Instagram", placeholder: "https://instagram.com/username", icon: "photo_camera" },
            { key: "tiktok_url" as keyof FormState, label: "TikTok", placeholder: "https://tiktok.com/@username", icon: "music_video" },
            { key: "twitter_url" as keyof FormState, label: "X / Twitter", placeholder: "https://x.com/username", icon: "alternate_email" },
          ].map(({ key, label, placeholder, icon }) => (
            <div key={key}>
              <label className={LABEL}>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[11px]">{icon}</span>
                  {label}
                </span>
              </label>
              <input
                type="url"
                value={String(form[key])}
                onChange={e => set$(key, e.target.value)}
                placeholder={placeholder}
                className={INPUT}
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="font-mono text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
