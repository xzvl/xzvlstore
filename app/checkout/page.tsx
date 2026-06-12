"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { supabaseClient } from "@/lib/supabase-client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ─── Types ────────────────────────────────────────────────────────────────────

type AddressForm = {
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  region: string;
};

type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  payment_method: string;
  billing: AddressForm;
  ship_to_different: boolean;
  shipping: AddressForm;
};

type AddressErrors = Partial<AddressForm>;

type FormErrors = {
  name?: string;
  email?: string;
  phone?: string;
  billing?: AddressErrors;
  shipping?: AddressErrors;
};

const EMPTY_ADDRESS: AddressForm = {
  address_1: "",
  address_2: "",
  city: "",
  state: "",
  postcode: "",
  region: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputClass = (err = false) =>
  `w-full bg-[#1f1f1f] border ${err ? "border-primary" : "border-[#603e39]"} text-[#e2e2e2] font-mono text-[13px] px-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/25`;

const labelClass =
  "block font-mono text-[11px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-2";

const formatAddress = (a: AddressForm) =>
  [a.address_1, a.address_2, a.city, a.state, a.postcode, a.region].filter(Boolean).join(", ");

const validatePhone = (v: string) => {
  if (!v) return "Phone is required.";
  const digits = v.replace(/[\s\-().+]/g, "");
  if (!/^(09\d{9}|639\d{9})$/.test(digits))
    return "Enter a valid PH mobile number (e.g. 09XX XXX XXXX).";
  return "";
};

const validateEmail = (v: string) => {
  if (!v) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
    return "Enter a valid email address.";
  return "";
};

const PAYMENT_METHODS = [
  { value: "gcash", label: "GCash" },
  { value: "cash", label: "Cash (For Pickup Only)" },
  { value: "bank", label: "Bank Transfer" },
  { value: "maya", label: "Maya / PayMaya" },
];

// ─── Address fields block ─────────────────────────────────────────────────────

function AddressFields({
  value,
  errors = {},
  onChange,
  prefix,
}: {
  value: AddressForm;
  errors?: AddressErrors;
  onChange: (updated: AddressForm) => void;
  prefix: string;
}) {
  const set = (field: keyof AddressForm, v: string) =>
    onChange({ ...value, [field]: v });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor={`${prefix}-address_1`}>
          Address Line 1 <span className="text-primary">*</span>
        </label>
        <input
          id={`${prefix}-address_1`}
          value={value.address_1}
          onChange={(e) => set("address_1", e.target.value)}
          placeholder="House No., Street"
          className={inputClass(!!errors.address_1)}
        />
        {errors.address_1 && (
          <p className="font-mono text-[10px] text-primary mt-1">{errors.address_1}</p>
        )}
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor={`${prefix}-address_2`}>
          Address Line 2
        </label>
        <input
          id={`${prefix}-address_2`}
          value={value.address_2}
          onChange={(e) => set("address_2", e.target.value)}
          placeholder="Barangay, Subdivision"
          className={inputClass()}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${prefix}-city`}>
          City <span className="text-primary">*</span>
        </label>
        <input
          id={`${prefix}-city`}
          value={value.city}
          onChange={(e) => set("city", e.target.value)}
          placeholder="Quezon City"
          className={inputClass(!!errors.city)}
        />
        {errors.city && (
          <p className="font-mono text-[10px] text-primary mt-1">{errors.city}</p>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor={`${prefix}-state`}>
          State / Province <span className="text-primary">*</span>
        </label>
        <input
          id={`${prefix}-state`}
          value={value.state}
          onChange={(e) => set("state", e.target.value)}
          placeholder="Province"
          className={inputClass(!!errors.state)}
        />
        {errors.state && (
          <p className="font-mono text-[10px] text-primary mt-1">{errors.state}</p>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor={`${prefix}-postcode`}>
          Postcode / ZIP <span className="text-primary">*</span>
        </label>
        <input
          id={`${prefix}-postcode`}
          value={value.postcode}
          onChange={(e) => set("postcode", e.target.value)}
          placeholder="1234"
          className={inputClass(!!errors.postcode)}
        />
        {errors.postcode && (
          <p className="font-mono text-[10px] text-primary mt-1">{errors.postcode}</p>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor={`${prefix}-region`}>
          Region
        </label>
        <input
          id={`${prefix}-region`}
          value={value.region}
          onChange={(e) => set("region", e.target.value)}
          placeholder="Philippines"
          className={inputClass()}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);

  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    email: "",
    phone: "",
    payment_method: "gcash",
    billing: { ...EMPTY_ADDRESS },
    ship_to_different: false,
    shipping: { ...EMPTY_ADDRESS },
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    supabaseClient.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { user, access_token } = data.session;
      setUserEmail(user.email ?? null);
      setUserId(user.id);

      const res = await fetch("/api/account/profile", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!res.ok) {
        setForm((f) => ({ ...f, email: user.email ?? "" }));
        return;
      }
      const profile = await res.json();
      const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
      setForm((f) => ({
        ...f,
        name: name || f.name,
        email: user.email ?? f.email,
        phone: profile.billing_phone || f.phone,
        billing: {
          address_1: profile.billing_address_1 || f.billing.address_1,
          address_2: profile.billing_address_2 || f.billing.address_2,
          city: profile.billing_city || f.billing.city,
          state: profile.billing_state || f.billing.state,
          postcode: profile.billing_postcode || f.billing.postcode,
          region: profile.billing_region || f.billing.region,
        },
      }));
      setAutoFilled(true);
    });
  }, []);

  function setField<K extends keyof CheckoutForm>(field: K, value: CheckoutForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field !== "billing" && field !== "shipping" && field !== "ship_to_different") {
      setErrors((e) => ({ ...e, [field]: "" }));
    }
  }

  function validateAddress(addr: AddressForm): AddressErrors | undefined {
    const e: AddressErrors = {};
    if (!addr.address_1) e.address_1 = "Address line 1 is required.";
    if (!addr.city) e.city = "City is required.";
    if (!addr.state) e.state = "Province is required.";
    if (!addr.postcode) e.postcode = "Postcode is required.";
    return Object.keys(e).length ? e : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newErrors: FormErrors = {};
    if (!form.name) newErrors.name = "Name is required.";
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) newErrors.phone = phoneErr;
    const emailErr = validateEmail(form.email);
    if (emailErr) newErrors.email = emailErr;

    const billingErr = validateAddress(form.billing);
    if (billingErr) newErrors.billing = billingErr;

    if (form.ship_to_different) {
      const shippingErr = validateAddress(form.shipping);
      if (shippingErr) newErrors.shipping = shippingErr;
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    if (items.length === 0) {
      setSubmitError("Your cart is empty.");
      return;
    }

    setSubmitError("");
    setSubmitting(true);

    try {
      const orderItems = items.map((item) => ({
        product_id: item.id,
        product: item.name,
        qty: item.qty,
        unit_price: item.sale_price ?? item.price,
        subtotal: (item.sale_price ?? item.price) * item.qty,
      }));
      const estimatedTotal = orderItems.reduce((s, i) => s + i.subtotal, 0);

      const deliveryAddress = form.ship_to_different
        ? formatAddress(form.shipping)
        : formatAddress(form.billing);

      const res = await fetch("/api/pre-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          location: [form.billing.city, form.billing.state].filter(Boolean).join(", "),
          payment_method: form.payment_method,
          status: "pending",
          customer_id: userId,
          billing: form.billing,
          shipping: form.ship_to_different ? form.shipping : form.billing,
          items: orderItems,
          estimatedTotal,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to place order.");
      }

      const data = await res.json();
      setOrderNumber(data.order_number ?? null);
      clearCart();
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <>
        <Header />
        <main className="bg-[#131313] min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md animate-fade-up">
            <span className="material-symbols-outlined text-[64px] text-primary mb-6 block">
              check_circle
            </span>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary mb-3">
              Order Received
            </p>
            <h1 className="font-inter font-black text-[32px] uppercase text-[#e2e2e2] mb-4">
              Thank You!
            </h1>
            {orderNumber && (
              <p className="font-mono text-[13px] text-[#ebbbb4]/60 mb-2">
                Order #{String(orderNumber).padStart(5, "0")}
              </p>
            )}
            <p className="font-mono text-[12px] text-[#ebbbb4]/50 leading-relaxed mb-8">
              Your order has been placed. We&apos;ll reach out via email or phone
              to confirm your order and arrange payment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white font-mono text-[11px] tracking-[0.2em] uppercase hover:brightness-110 transition-all"
              >
                Back to Store
              </Link>
              {userEmail && (
                <Link
                  href="/account"
                  className="inline-flex items-center gap-3 px-8 py-4 border border-[#603e39] text-[#ebbbb4]/60 font-mono text-[11px] tracking-[0.2em] uppercase hover:border-primary hover:text-primary transition-all"
                >
                  View Orders
                </Link>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="bg-[#131313] min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <p className="font-inter font-bold text-[20px] text-[#e2e2e2]/60 uppercase mb-4">
              Your cart is empty
            </p>
            <Link
              href="/collection/new-releases"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-mono text-[11px] tracking-widest uppercase hover:brightness-110 transition-all"
            >
              Browse Products
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────

  return (
    <>
      <Header />
      <main className="bg-[#131313] min-h-screen">
        <div className="max-w-[1440px] mx-auto px-4 md:px-16 py-12">

          {/* Title */}
          <div className="mb-8">
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-1.5">
              // Checkout
            </p>
            <h1 className="font-inter font-black text-[32px] md:text-[40px] uppercase leading-none text-[#e2e2e2]">
              Complete Your Order
            </h1>
          </div>

          {/* Auth banner */}
          {!userEmail ? (
            <div className="mb-8 border border-[#603e39]/40 bg-[#1a1a1a] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[22px] flex-shrink-0 mt-0.5">account_circle</span>
                <div>
                  <p className="font-mono text-[12px] text-[#e2e2e2] tracking-wide mb-1">Have an account?</p>
                  <div className="flex flex-col gap-1">
                    <p className="font-mono text-[10px] text-[#ebbbb4]/50 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[11px] text-primary/60">receipt_long</span>
                      Track your orders in one place
                    </p>
                    <p className="font-mono text-[10px] text-[#ebbbb4]/50 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[11px] text-primary/60">edit_note</span>
                      Auto-fill this form from your saved info
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Link
                  href="/auth/login?redirect=/checkout"
                  className="px-4 py-2 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/10 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup?redirect=/checkout"
                  className="font-mono text-[11px] text-[#ebbbb4]/50 hover:text-primary transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-8 border border-[#603e39]/40 bg-[#1a1a1a] px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[18px] ${autoFilled ? "text-green-400" : "text-primary"}`}>
                  {autoFilled ? "check_circle" : "account_circle"}
                </span>
                <div>
                  <p className="font-mono text-[11px] text-[#e2e2e2]">
                    {autoFilled ? "Form auto-filled from your account" : "Signed in"}
                  </p>
                  <p className="font-mono text-[10px] text-[#ebbbb4]/40 mt-0.5">{userEmail}</p>
                </div>
              </div>
              <Link href="/account" className="font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                My Account
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* ── Left: form sections ── */}
              <div className="lg:col-span-2 space-y-6">

                {/* Contact */}
                <div className="border border-[#603e39]/25 p-6">
                  <h2 className="font-inter font-bold text-[14px] uppercase text-[#e2e2e2] mb-5 flex items-center gap-2">
                    <span className="font-mono text-primary text-[10px]">01 /</span>
                    Contact Information
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        Full Name <span className="text-primary">*</span>
                      </label>
                      <input
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        placeholder="Juan Dela Cruz"
                        className={inputClass(!!errors.name)}
                      />
                      {errors.name && (
                        <p className="font-mono text-[10px] text-primary mt-1">{errors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>
                        Email <span className="text-primary">*</span>
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder="juan@example.com"
                        className={inputClass(!!errors.email)}
                      />
                      {errors.email && (
                        <p className="font-mono text-[10px] text-primary mt-1">{errors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>
                        Phone <span className="text-primary">*</span>
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setField("phone", e.target.value)}
                        placeholder="09XX XXX XXXX"
                        className={inputClass(!!errors.phone)}
                      />
                      {errors.phone && (
                        <p className="font-mono text-[10px] text-primary mt-1">{errors.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billing address */}
                <div className="border border-[#603e39]/25 p-6">
                  <h2 className="font-inter font-bold text-[14px] uppercase text-[#e2e2e2] mb-5 flex items-center gap-2">
                    <span className="font-mono text-primary text-[10px]">02 /</span>
                    Billing Address
                  </h2>
                  <AddressFields
                    prefix="billing"
                    value={form.billing}
                    errors={errors.billing}
                    onChange={(updated) => {
                      setField("billing", updated);
                      setErrors((e) => ({ ...e, billing: undefined }));
                    }}
                  />
                </div>

                {/* Shipping address */}
                <div className="border border-[#603e39]/25 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-inter font-bold text-[14px] uppercase text-[#e2e2e2] flex items-center gap-2">
                      <span className="font-mono text-primary text-[10px]">03 /</span>
                      Shipping Address
                    </h2>
                    {/* Toggle: ship to different address */}
                    <button
                      type="button"
                      onClick={() => setField("ship_to_different", !form.ship_to_different)}
                      className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-[#ebbbb4]/60 hover:text-primary transition-colors"
                    >
                      <div className={`w-8 h-4 rounded-full border transition-colors relative ${form.ship_to_different ? "bg-primary/20 border-primary" : "bg-[#1f1f1f] border-[#603e39]"}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${form.ship_to_different ? "left-4 bg-primary" : "left-0.5 bg-[#603e39]"}`} />
                      </div>
                      Different address
                    </button>
                  </div>

                  {form.ship_to_different ? (
                    <AddressFields
                      prefix="shipping"
                      value={form.shipping}
                      errors={errors.shipping}
                      onChange={(updated) => {
                        setField("shipping", updated);
                        setErrors((e) => ({ ...e, shipping: undefined }));
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-3 py-3 px-4 bg-[#1a1a1a] border border-[#603e39]/20">
                      <span className="material-symbols-outlined text-[16px] text-primary/60">check_circle</span>
                      <p className="font-mono text-[11px] text-[#ebbbb4]/50">
                        Same as billing address
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment method */}
                <div className="border border-[#603e39]/25 p-6">
                  <h2 className="font-inter font-bold text-[14px] uppercase text-[#e2e2e2] mb-5 flex items-center gap-2">
                    <span className="font-mono text-primary text-[10px]">04 /</span>
                    Payment Method
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm.value}
                        type="button"
                        onClick={() => setField("payment_method", pm.value)}
                        className={`py-3 px-4 border font-mono text-[12px] tracking-wide text-left transition-all ${
                          form.payment_method === pm.value
                            ? "border-primary text-primary bg-primary/5"
                            : "border-[#603e39]/40 text-[#e2e2e2]/50 hover:border-[#603e39]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full border flex-shrink-0 ${
                              form.payment_method === pm.value
                                ? "border-primary bg-primary"
                                : "border-[#603e39]"
                            }`}
                          />
                          {pm.label}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="font-mono text-[10px] text-[#ebbbb4]/30 mt-4 leading-relaxed">
                    Payment instructions will be sent after your order is confirmed.
                  </p>
                </div>

                {submitError && (
                  <p className="font-mono text-[12px] text-primary border border-primary/30 p-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {submitError}
                  </p>
                )}
              </div>

              {/* ── Right: order summary ── */}
              <div>
                <div className="sticky top-20 bg-[#1a1a1a] border border-[#603e39]/25 p-5 space-y-4">
                  <h2 className="font-inter font-bold text-[14px] uppercase text-[#e2e2e2]">
                    Order Summary
                  </h2>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-12 h-12 shrink-0 bg-[#131313] border border-[#603e39]/20 relative overflow-hidden">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-contain p-1"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-inter text-[11px] text-[#e2e2e2] leading-snug line-clamp-1">
                            {item.name}
                          </p>
                          <p className="font-mono text-[10px] text-[#ebbbb4]/40 mt-0.5">
                            × {item.qty}
                          </p>
                        </div>
                        <span className="font-mono text-[12px] text-[#e2e2e2] shrink-0">
                          ₱{((item.sale_price ?? item.price) * item.qty).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-[#603e39]/30" />

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] text-[#ebbbb4]/50">Shipping</span>
                    <span className="font-mono text-[11px] text-[#ebbbb4]/40 italic">TBA</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] uppercase text-[#e2e2e2]">Est. Total</span>
                    <span className="font-inter font-black text-[20px] text-primary">
                      ₱{total.toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-white font-mono text-[11px] tracking-[0.2em] uppercase hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">
                          progress_activity
                        </span>
                        Placing Order...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Place Order
                      </>
                    )}
                  </button>

                  <Link
                    href="/cart"
                    className="flex items-center justify-center w-full py-2.5 border border-[#603e39]/40 font-mono text-[10px] tracking-widest uppercase text-[#e2e2e2]/30 hover:text-primary hover:border-primary transition-all"
                  >
                    ← Back to Cart
                  </Link>
                </div>
              </div>

            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
