"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { supabaseClient } from "@/lib/supabase-client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlockedBanner from "@/components/BlockedBanner";
import PaymentMethodPicker from "@/components/PaymentMethodPicker";
import PaymentProofUpload, { type UploadedPaymentProof } from "@/components/PaymentProofUpload";
import { useSiteContent } from "@/components/SiteContentProvider";
import { activePaymentMethods } from "@/lib/site-content";
import { DELIVERY_METHODS, type DeliveryMethod } from "@/lib/shipping";
import { ProvinceCityFields, ShippingSummaryRow, useShippingQuote } from "@/components/AreaFields";

// ─── Types ────────────────────────────────────────────────────────────────────

type AddressForm = {
  address_1: string;
  address_2: string;
  city: string;
  /** J&T Express city id (from the city dropdown). */
  city_id: string;
  state: string;
  /** J&T Express province id (from the province dropdown). */
  province_id: string;
  postcode: string;
  region: string;
};

type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  facebook: string;
  payment_method: string;
  billing: AddressForm;
  delivery: DeliveryMethod;
  receiver_name: string;
  ship_to_different: boolean;
  shipping: AddressForm;
};

type AddressErrors = Partial<AddressForm>;

type FormErrors = {
  name?: string;
  email?: string;
  phone?: string;
  facebook?: string;
  receiver_name?: string;
  billing?: AddressErrors;
  shipping?: AddressErrors;
};

const REGION = "Philippines";

const EMPTY_ADDRESS: AddressForm = {
  address_1: "",
  address_2: "",
  city: "",
  city_id: "",
  state: "",
  province_id: "",
  postcode: "",
  region: REGION,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputClass = (err = false) =>
  `w-full bg-panel border ${err ? "border-primary" : "border-line"} text-fg font-mono text-[13px] px-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-accent/25`;

const labelClass =
  "block font-mono text-[11px] tracking-[0.15em] uppercase text-accent/60 mb-2";

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

const validateFacebook = (v: string) => {
  if (!v) return "Facebook link is required.";
  if (!/^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/.+/i.test(v.trim()))
    return "Enter a valid Facebook profile link.";
  return "";
};

const FALLBACK_PAYMENT_METHODS = [
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
      <ProvinceCityFields
        prefix={prefix}
        value={value}
        errors={errors}
        onChange={(v) => onChange({ ...value, ...v })}
        inputClass={inputClass}
        labelClass={labelClass}
      />
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
          value={REGION}
          readOnly
          tabIndex={-1}
          className={`${inputClass()} opacity-60 cursor-not-allowed`}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, total, clearCart, revalidateCart, isBlocked } = useCart();
  // Methods from /admin/content → Payment; the built-in FALLBACK_PAYMENT_METHODS list is
  // the fallback until any are configured.
  const siteContent = useSiteContent();
  const configuredMethods = activePaymentMethods(siteContent.payment);
  const shippingContent = siteContent.shipping;

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);

  useEffect(() => {
    revalidateCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    email: "",
    phone: "",
    facebook: "",
    payment_method: configuredMethods[0]?.id ?? "gcash",
    billing: { ...EMPTY_ADDRESS },
    delivery: "jnt",
    receiver_name: "",
    ship_to_different: false,
    shipping: { ...EMPTY_ADDRESS },
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [proof, setProof] = useState<UploadedPaymentProof | null>(null);
  const [proofError, setProofError] = useState("");
  const [paymentVerified, setPaymentVerified] = useState(false);

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
        facebook: profile.facebook_url || f.facebook,
        // Province/city ids are matched from these names once the J&T lists load.
        billing: {
          ...f.billing,
          address_1: profile.billing_address_1 || f.billing.address_1,
          address_2: profile.billing_address_2 || f.billing.address_2,
          city: profile.billing_city || f.billing.city,
          state: profile.billing_state || f.billing.state,
          postcode: profile.billing_postcode || f.billing.postcode,
        },
      }));
      setAutoFilled(true);
    });
  }, []);

  function setField<K extends keyof CheckoutForm>(field: K, value: CheckoutForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field !== "billing" && field !== "shipping" && field !== "ship_to_different" && field !== "delivery") {
      setErrors((e) => ({ ...e, [field]: "" }));
    }
  }

  // The J&T rate needs the province and city picked from the lists (ids), not just typed.
  function validateAddress(addr: AddressForm, forShipping: boolean): AddressErrors | undefined {
    const e: AddressErrors = {};
    if (!addr.address_1) e.address_1 = "Address line 1 is required.";
    if (!addr.state) e.state = "Province is required.";
    else if (forShipping && !addr.province_id) e.state = "Pick your province from the list.";
    if (!addr.city) e.city = "City is required.";
    else if (forShipping && !addr.city_id) e.city = "Pick your city from the list.";
    if (!addr.postcode) e.postcode = "Postcode is required.";
    return Object.keys(e).length ? e : undefined;
  }

  // Bundles are saved as their individual products at normal price; the
  // server turns the bundle's price off into the order discount.
  const orderItems = items.flatMap((item) =>
    item.bundle
      ? item.bundle.items.map((b) => ({
          product_id: b.product_id,
          product: b.name,
          qty: b.qty * item.qty,
          unit_price: b.unit_price,
          subtotal: b.unit_price * b.qty * item.qty,
        }))
      : [{
          product_id: item.id,
          product: item.name,
          qty: item.qty,
          unit_price: item.sale_price ?? item.price,
          subtotal: (item.sale_price ?? item.price) * item.qty,
        }]
  );

  const isJnt = form.delivery === "jnt";
  const deliveryAddress = form.ship_to_different ? form.shipping : form.billing;
  const shippingQuote = useShippingQuote({
    enabled: isJnt,
    provinceId: deliveryAddress.province_id,
    cityId: deliveryAddress.city_id,
    items: orderItems.map((i) => ({ product_id: i.product_id, qty: i.qty })),
    goodsValue: total,
  });
  const shippingFee = isJnt ? shippingQuote.quote?.fee ?? null : 0;
  const grandTotal = total + (shippingFee ?? 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isBlocked) return;

    const newErrors: FormErrors = {};
    if (!form.name) newErrors.name = "Name is required.";
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) newErrors.phone = phoneErr;
    const emailErr = validateEmail(form.email);
    if (emailErr) newErrors.email = emailErr;
    const facebookErr = validateFacebook(form.facebook);
    if (facebookErr) newErrors.facebook = facebookErr;

    const billingErr = validateAddress(form.billing, isJnt && !form.ship_to_different);
    if (billingErr) newErrors.billing = billingErr;

    if (isJnt) {
      if (!(form.receiver_name.trim() || form.name.trim())) newErrors.receiver_name = "Receiver name is required.";
      if (form.ship_to_different) {
        const shippingErr = validateAddress(form.shipping, true);
        if (shippingErr) newErrors.shipping = shippingErr;
      }
    }

    setProofError(proof ? "" : "Please upload a screenshot of your payment.");

    if (Object.keys(newErrors).length || !proof) {
      setErrors(newErrors);
      return;
    }

    if (items.length === 0) {
      setSubmitError("Your cart is empty.");
      return;
    }

    setSubmitError("");
    setSubmitting(true);

    // Re-check availability, stock, and purchase limits right before placing
    // the order — the cart in memory may be stale (e.g. an item went out of
    // stock, was disabled, or its purchase limit changed since it was added).
    const { changed } = await revalidateCart();
    if (changed) {
      setSubmitError("Your cart changed — please review the updated items below and try again.");
      setSubmitting(false);
      return;
    }

    try {
      const bundles = items
        .filter((item) => item.bundle)
        .map((item) => ({ id: item.bundle!.id, qty: item.qty }));
      const estimatedTotal = total;

      const res = await fetch("/api/pre-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          facebook: form.facebook,
          location: [form.billing.city, form.billing.state].filter(Boolean).join(", "),
          payment_method: configuredMethods.find((m) => m.id === form.payment_method)?.company ?? form.payment_method,
          payment_proof_url: proof.url,
          order_type: "checkout",
          customer_id: userId,
          billing: { ...form.billing, region: REGION },
          shipping: { ...(isJnt ? deliveryAddress : form.billing), region: REGION },
          delivery_method: form.delivery,
          shipping_name: isJnt ? (form.receiver_name.trim() || form.name.trim()) : form.name.trim(),
          // Only for the summary/email — the server re-quotes J&T itself.
          shipping_fee: shippingFee,
          items: orderItems,
          bundles,
          estimatedTotal,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to place order.");
      }

      const data = await res.json();
      setOrderNumber(data.order_number ?? null);
      setPaymentVerified(!!data.verified);
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
        <main className="bg-canvas min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md animate-fade-up">
            <span className="material-symbols-outlined text-[64px] text-primary mb-6 block">
              check_circle
            </span>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary mb-3">
              Order Received
            </p>
            <h1 className="font-inter font-black text-[32px] uppercase text-fg mb-4">
              Thank You!
            </h1>
            {orderNumber && (
              <p className="font-mono text-[13px] text-accent/60 mb-2">
                Order #{String(orderNumber).padStart(5, "0")}
              </p>
            )}
            {paymentVerified ? (
              <p className="font-mono text-[12px] text-accent/50 leading-relaxed mb-8">
                <span className="text-green-400">Payment verified — your order is confirmed.</span>{" "}
                We&apos;ll reach out via email or phone about shipping.
              </p>
            ) : (
              <p className="font-mono text-[12px] text-accent/50 leading-relaxed mb-8">
                Your order has been placed and is <span className="text-orange-400">pending</span> while we
                review your proof of payment. We&apos;ll reach out via email or phone once it&apos;s confirmed.
              </p>
            )}
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
                  className="inline-flex items-center gap-3 px-8 py-4 border border-line text-accent/60 font-mono text-[11px] tracking-[0.2em] uppercase hover:border-primary hover:text-primary transition-all"
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
        <main className="bg-canvas min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <p className="font-inter font-bold text-[20px] text-fg/60 uppercase mb-4">
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

  const proofUpload = (
    <PaymentProofUpload
      expectedAmount={grandTotal}
      value={proof}
      onChange={(p) => { setProof(p); if (p) setProofError(""); }}
      error={proofError}
    />
  );

  return (
    <>
      <Header />
      <main className="bg-canvas min-h-screen">
        <div className="max-w-[1440px] mx-auto px-4 md:px-16 py-12">

          {/* Title */}
          <div className="mb-8">
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-1.5">
              // Checkout
            </p>
            <h1 className="font-inter font-black text-[32px] md:text-[40px] uppercase leading-none text-fg">
              Complete Your Order
            </h1>
          </div>

          <BlockedBanner />

          {/* Auth banner */}
          {!userEmail ? (
            <div className="mb-8 border border-line/40 bg-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[22px] flex-shrink-0 mt-0.5">account_circle</span>
                <div>
                  <p className="font-mono text-[12px] text-fg tracking-wide mb-1">Have an account?</p>
                  <div className="flex flex-col gap-1">
                    <p className="font-mono text-[10px] text-accent/50 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[11px] text-primary/60">receipt_long</span>
                      Track your orders in one place
                    </p>
                    <p className="font-mono text-[10px] text-accent/50 flex items-center gap-1.5">
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
                  className="font-mono text-[11px] text-accent/50 hover:text-primary transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-8 border border-line/40 bg-panel px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[18px] ${autoFilled ? "text-green-400" : "text-primary"}`}>
                  {autoFilled ? "check_circle" : "account_circle"}
                </span>
                <div>
                  <p className="font-mono text-[11px] text-fg">
                    {autoFilled ? "Form auto-filled from your account" : "Signed in"}
                  </p>
                  <p className="font-mono text-[10px] text-accent/40 mt-0.5">{userEmail}</p>
                </div>
              </div>
              <Link href="/account" className="font-mono text-[10px] text-accent/40 hover:text-primary transition-colors flex items-center gap-1">
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
                <div className="border border-line/25 p-6">
                  <h2 className="font-inter font-bold text-[14px] uppercase text-fg mb-5 flex items-center gap-2">
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
                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        Facebook Link <span className="text-primary">*</span>
                      </label>
                      <input
                        type="url"
                        value={form.facebook}
                        onChange={(e) => setField("facebook", e.target.value)}
                        placeholder="https://facebook.com/username"
                        className={inputClass(!!errors.facebook)}
                      />
                      {errors.facebook && (
                        <p className="font-mono text-[10px] text-primary mt-1">{errors.facebook}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billing address */}
                <div className="border border-line/25 p-6">
                  <h2 className="font-inter font-bold text-[14px] uppercase text-fg mb-5 flex items-center gap-2">
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
                <div className="border border-line/25 p-6">
                  <h2 className="font-inter font-bold text-[14px] uppercase text-fg mb-5 flex items-center gap-2">
                    <span className="font-mono text-primary text-[10px]">03 /</span>
                    Shipping Address
                  </h2>

                  {/* Delivery method */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {([
                      { key: "jnt", icon: "local_shipping", hint: "Delivered to your address" },
                      { key: "pickup", icon: "storefront", hint: "No shipping fee" },
                    ] as const).map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setField("delivery", m.key)}
                        className={`flex items-center gap-3 py-3 px-4 border text-left transition-all ${
                          form.delivery === m.key
                            ? "border-primary bg-primary/5"
                            : "border-line/40 hover:border-line"
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[20px] ${form.delivery === m.key ? "text-primary" : "text-accent/40"}`}>
                          {m.icon}
                        </span>
                        <span>
                          <span className={`block font-mono text-[12px] tracking-wide ${form.delivery === m.key ? "text-primary" : "text-fg/70"}`}>
                            {DELIVERY_METHODS[m.key]}
                          </span>
                          <span className="block font-mono text-[10px] text-accent/40 mt-0.5">{m.hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  {isJnt ? (
                    <div className="space-y-5">
                      <div>
                        <label className={labelClass} htmlFor="receiver_name">
                          Receiver Name <span className="text-primary">*</span>
                        </label>
                        <input
                          id="receiver_name"
                          value={form.receiver_name}
                          onChange={(e) => setField("receiver_name", e.target.value)}
                          placeholder={form.name || "Juan Dela Cruz"}
                          className={inputClass(!!errors.receiver_name)}
                        />
                        {errors.receiver_name ? (
                          <p className="font-mono text-[10px] text-primary mt-1">{errors.receiver_name}</p>
                        ) : (
                          <p className="font-mono text-[10px] text-accent/40 mt-1">Leave blank to use your full name.</p>
                        )}
                      </div>

                      {/* Toggle: ship to different address */}
                      <button
                        type="button"
                        onClick={() => setField("ship_to_different", !form.ship_to_different)}
                        className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-accent/60 hover:text-primary transition-colors"
                      >
                        <div className={`w-8 h-4 rounded-full border transition-colors relative ${form.ship_to_different ? "bg-primary/20 border-primary" : "bg-panel border-line"}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${form.ship_to_different ? "left-4 bg-primary" : "left-0.5 bg-line"}`} />
                        </div>
                        Ship to a different address
                      </button>

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
                        <div className="flex items-center gap-3 py-3 px-4 bg-panel border border-line/20">
                          <span className="material-symbols-outlined text-[16px] text-primary/60">check_circle</span>
                          <p className="font-mono text-[11px] text-accent/50">
                            Same as billing address
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 py-3 px-4 bg-panel border border-line/20">
                      <span className="material-symbols-outlined text-[16px] text-primary/60 mt-0.5">storefront</span>
                      <p className="font-mono text-[11px] text-accent/60 leading-relaxed whitespace-pre-line">
                        {shippingContent.pickupNote || "We'll message you with the pickup details."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment method */}
                <div className="border border-line/25 p-6">
                  <h2 className="font-inter font-bold text-[14px] uppercase text-fg mb-5 flex items-center gap-2">
                    <span className="font-mono text-primary text-[10px]">04 /</span>
                    Payment Method
                  </h2>
                  {configuredMethods.length > 0 ? (
                    <PaymentMethodPicker
                      methods={configuredMethods}
                      value={form.payment_method}
                      onChange={(id) => setField("payment_method", id)}
                      proof={proofUpload}
                    />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {FALLBACK_PAYMENT_METHODS.map((pm) => (
                          <button
                            key={pm.value}
                            type="button"
                            onClick={() => setField("payment_method", pm.value)}
                            className={`py-3 px-4 border font-mono text-[12px] tracking-wide text-left transition-all ${
                              form.payment_method === pm.value
                                ? "border-primary text-primary bg-primary/5"
                                : "border-line/40 text-fg/50 hover:border-line"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full border flex-shrink-0 ${
                                  form.payment_method === pm.value
                                    ? "border-primary bg-primary"
                                    : "border-line"
                                }`}
                              />
                              {pm.label}
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 max-w-sm">{proofUpload}</div>
                    </>
                  )}
                </div>

                {/* Confirmation screenshot notice */}
                <div className="border border-orange-400/30 bg-orange-400/5 px-4 py-4 flex gap-3">
                  <span className="material-symbols-outlined text-[18px] text-orange-400/70 flex-shrink-0 mt-0.5">photo_camera</span>
                  <div className="space-y-1">
                    <p className="font-mono text-[11px] tracking-widest uppercase text-orange-400/70">Important</p>
                    <p className="font-mono text-[12px] text-accent/50 leading-relaxed">
                      After submitting, please take a{" "}
                      <span className="text-fg/80">screenshot of the confirmation/thank you message</span>{" "}
                      and send it to our official Facebook page{" "}
                      <a
                        href="https://www.facebook.com/xzviel"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        facebook.com/xzviel
                      </a>{" "}
                      to confirm your order.
                    </p>
                  </div>
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
                <div className="sticky top-20 bg-panel border border-line/25 p-5 space-y-4">
                  <h2 className="font-inter font-bold text-[14px] uppercase text-fg">
                    Order Summary
                  </h2>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-12 h-12 shrink-0 bg-canvas border border-line/20 relative overflow-hidden">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="48px"
                            className="object-contain p-1"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-inter text-[11px] text-fg leading-snug line-clamp-1">
                            {item.name}
                          </p>
                          <p className="font-mono text-[10px] text-accent/40 mt-0.5">
                            × {item.qty}
                            {item.bundle && (
                              <span className="ml-1.5">· Bundle of {item.bundle.items.reduce((s, b) => s + b.qty, 0)}</span>
                            )}
                          </p>
                        </div>
                        <div className="shrink-0 text-right leading-tight">
                          <span className="font-mono text-[12px] text-fg">
                            ₱{((item.sale_price ?? item.price) * item.qty).toLocaleString()}
                          </span>
                          {item.bundle && item.sale_price != null && item.sale_price < item.price && (
                            <p className="font-mono text-[10px] text-fg/30 line-through">
                              ₱{(item.price * item.qty).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-line/30" />

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] text-accent/50">Subtotal</span>
                    <span className="font-mono text-[12px] text-fg">₱{total.toLocaleString()}</span>
                  </div>

                  <ShippingSummaryRow
                    delivery={form.delivery}
                    quote={shippingQuote}
                    hasCity={!!deliveryAddress.city_id}
                  />

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] uppercase text-fg">{shippingFee == null ? "Est. Total" : "Total"}</span>
                    <span className="font-inter font-black text-[20px] text-primary">
                      ₱{grandTotal.toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || isBlocked}
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
                    className="flex items-center justify-center w-full py-2.5 border border-line/40 font-mono text-[10px] tracking-widest uppercase text-fg/30 hover:text-primary hover:border-primary transition-all"
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
