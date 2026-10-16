"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProvinceCityNameFields } from "@/components/AreaFields";
import type { Order } from "@/lib/supabase";
import { sizedImageUrl } from "@/lib/image-sizes";

type Tab = "info" | "billing" | "shipping" | "orders";
const TABS_LIST: Tab[] = ["orders", "info", "billing", "shipping"];

type Profile = {
  first_name: string; last_name: string; email: string; facebook_url: string;
  billing_address_1: string; billing_address_2: string; billing_city: string;
  billing_postcode: string; billing_region: string; billing_state: string; billing_phone: string;
  shipping_address_1: string; shipping_address_2: string; shipping_city: string;
  shipping_postcode: string; shipping_region: string; shipping_state: string; shipping_phone: string;
  is_blocked: boolean; block_reason: string;
};

const EMPTY_PROFILE: Profile = {
  first_name: "", last_name: "", email: "", facebook_url: "",
  billing_address_1: "", billing_address_2: "", billing_city: "",
  billing_postcode: "", billing_region: "Philippines", billing_state: "", billing_phone: "",
  shipping_address_1: "", shipping_address_2: "", shipping_city: "",
  shipping_postcode: "", shipping_region: "Philippines", shipping_state: "", shipping_phone: "",
  is_blocked: false, block_reason: "",
};

const validateFacebook = (v: string) => {
  if (!v.trim()) return "Facebook link is required.";
  if (!/^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/.+/i.test(v.trim())) return "Enter a valid Facebook profile link.";
  return "";
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  "pre-order": "text-purple-400 border-purple-400/30 bg-purple-400/10",
  "hold pre-order": "text-fuchsia-400 border-fuchsia-400/30 bg-fuchsia-400/10",
  processing: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  confirmed: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  shipped: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  completed: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  cancelled: "text-accent/60 border-accent/20 bg-accent/5",
  refunded: "text-accent/60 border-accent/20 bg-accent/5",
};

const CLOSED: Order["status"][] = ["completed", "cancelled", "refunded"];

const INPUT = "w-full bg-deep border border-line/70 text-fg text-[13px] px-3.5 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors placeholder:text-accent/40";
const LABEL = "block text-[12px] font-medium text-accent/80 mb-1.5";
const CARD = "bg-panel border border-line/30 rounded-lg";
const PRIMARY_BTN = "inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm";

const peso = (n: number) => `₱${n.toLocaleString()}`;
const remainingOf = (o: Order) => Math.max(0, o.estimated_total - (o.down_payment ?? 0));
const hasOpenDownPayment = (o: Order) => (o.down_payment ?? 0) > 0 && o.status !== "completed";

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap ${STATUS_COLORS[status] ?? "text-accent/60 border-line/40"}`}>
      {status}
    </span>
  );
}

function OrderTotalInline({ order }: { order: Order }) {
  if (!hasOpenDownPayment(order)) {
    return <span className="text-[13px] text-fg font-semibold tabular-nums">{peso(order.estimated_total)}</span>;
  }
  return (
    <div className="leading-tight text-right">
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-[11px] text-accent/50 line-through tabular-nums">{peso(order.estimated_total)}</span>
        <span className="text-[13px] text-fg font-semibold tabular-nums">{peso(remainingOf(order))}</span>
      </div>
      <p className="text-[11px] text-accent/60 tabular-nums">DP {peso(order.down_payment ?? 0)} paid</p>
    </div>
  );
}

function ItemThumb({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div className="w-9 h-9 relative bg-deep border border-line/30 overflow-hidden flex-shrink-0 rounded-md">
      {src ? (
        <Image
          src={sizedImageUrl(src, "small") ?? src}
          alt={alt}
          fill
          sizes="36px"
          className="object-cover"
          onError={(e) => {
            if (e.currentTarget.src !== src) e.currentTarget.src = src;
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="material-symbols-outlined text-[16px] text-accent/40">image</span>
        </div>
      )}
    </div>
  );
}

function getTrackingUrl(deliveryMethod: string, trackingNumber: string): string {
  const tn = encodeURIComponent(trackingNumber);
  switch (deliveryMethod) {
    case "J&T Express": return `https://www.jtexpress.ph/trajectoryQuery?flag=1&waybillNo=${tn}`;
    case "LBC": return `https://www.lbcexpress.com/search?waybillNo=${tn}`;
    case "Shopee Express": return `https://spx.ph/track?waybillNo=${tn}`;
    case "Grab Express": return `https://express.grab.com/track/orders?ids=${tn}`;
    case "Lalamove": return `https://web.lalamove.com/login?waybillNo=${tn}`;
    default: return "";
  }
}

function Kpi({ label, icon, value, hint }: { label: string; icon: string; value: string; hint: string }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-accent/70">{label}</p>
        <span className="material-symbols-outlined text-[18px] text-accent/50">{icon}</span>
      </div>
      <p className="mt-2 text-[22px] leading-none font-semibold text-fg tabular-nums tracking-tight">{value}</p>
      <p className="mt-2 text-[11px] text-accent/60">{hint}</p>
    </div>
  );
}

function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line/20">
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold text-fg">{title}</h2>
        {subtitle && <p className="text-[12px] text-accent/60 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function AccountPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTabState] = useState<Tab>(
    tabParam && TABS_LIST.includes(tabParam) ? tabParam : "orders"
  );

  const setTab = (value: Tab) => {
    setTabState(value);
    router.replace(`/account?tab=${value}`, { scroll: false });
  };

  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  const [token, setToken] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [facebookError, setFacebookError] = useState("");

  useEffect(() => {
    supabaseClient.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/auth/login"); return; }
      const t = data.session.access_token;
      setToken(t);
      setEmailVerified(!!data.session.user.email_confirmed_at);
      const [profileRes, ordersRes] = await Promise.all([
        fetch("/api/account/profile", { headers: { Authorization: `Bearer ${t}` } }),
        fetch("/api/account/orders", { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile({ ...EMPTY_PROFILE, ...p });
      }
      if (ordersRes.ok) setOrders(await ordersRes.json());
      setLoading(false);
    });
  }, [router]);

  const set$ = (key: keyof Profile, value: string) =>
    setProfile(p => ({ ...p, [key]: value }));

  const copyBillingToShipping = () =>
    setProfile(p => ({
      ...p,
      shipping_address_1: p.billing_address_1,
      shipping_address_2: p.billing_address_2,
      shipping_city: p.billing_city,
      shipping_postcode: p.billing_postcode,
      shipping_region: p.billing_region,
      shipping_state: p.billing_state,
      shipping_phone: p.billing_phone,
    }));

  const save = async () => {
    const facebookErr = validateFacebook(profile.facebook_url);
    if (facebookErr) {
      setFacebookError(facebookErr);
      setTab("info");
      return;
    }
    setFacebookError("");
    setSaving(true);
    setSaveMsg(""); setSaveError("");
    const res = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile),
    });
    if (res.ok) {
      setSaveMsg("Saved successfully.");
      setTimeout(() => setSaveMsg(""), 3000);
    } else {
      const json = await res.json();
      setSaveError(json.error ?? "Failed to save.");
    }
    setSaving(false);
  };

  const signOut = async () => {
    await supabaseClient.auth.signOut();
    router.push("/auth/login");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match."); return; }
    setPwSaving(true); setPwError(""); setPwMsg("");
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
    } else {
      setPwMsg("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwMsg(""), 3000);
    }
    setPwSaving(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila",
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-deep flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-[24px]">progress_activity</span>
      </div>
    );
  }

  const TABS: { value: Tab; label: string; icon: string; hint: string }[] = [
    { value: "orders", label: "Orders", icon: "receipt_long", hint: "Order history and tracking" },
    { value: "info", label: "Profile", icon: "person", hint: "Personal details and password" },
    { value: "billing", label: "Billing", icon: "credit_card", hint: "Billing address" },
    { value: "shipping", label: "Shipping", icon: "local_shipping", hint: "Delivery address" },
  ];
  const activeTab = TABS.find(t => t.value === tab)!;

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const initials = (fullName || profile.email || "?").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const openOrders = orders.filter(o => !CLOSED.includes(o.status));
  const spent = orders.filter(o => o.status === "completed").reduce((s, o) => s + o.estimated_total, 0);
  const balanceDue = openOrders.reduce((s, o) => s + remainingOf(o), 0);

  return (
    <div className="min-h-screen bg-deep flex flex-col">
      <Header />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
          {/* Sidebar */}
          <aside className={`${CARD} lg:sticky lg:top-24 overflow-hidden`}>
            <div className="flex items-center gap-3 px-4 py-4 border-b border-line/20">
              <span className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[14px] font-semibold flex-shrink-0">
                {initials}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-[14px] font-semibold text-fg truncate">{fullName || "My Account"}</p>
                <p className="text-[12px] text-accent/60 truncate">{profile.email}</p>
              </div>
            </div>
            <nav className="flex lg:flex-col gap-0.5 p-2 overflow-x-auto scrollbar-none">
              {TABS.map(t => {
                const active = tab === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTab(t.value)}
                    className={`relative flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors whitespace-nowrap flex-shrink-0 ${
                      active ? "bg-primary/10 text-fg font-medium" : "text-accent/80 hover:text-fg hover:bg-fg/[0.04]"
                    }`}
                  >
                    {active && <span className="hidden lg:block absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary" />}
                    <span className={`material-symbols-outlined text-[18px] ${active ? "text-primary" : "text-accent/60"}`}>{t.icon}</span>
                    {t.label}
                    {t.value === "orders" && orders.length > 0 && (
                      <span className="ml-auto pl-2 text-[11px] text-accent/60 tabular-nums">{orders.length}</span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="hidden lg:block p-2 border-t border-line/20">
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-accent/80 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign out
              </button>
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0 space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-semibold text-fg tracking-tight">{activeTab.label}</h1>
                <p className="text-[13px] text-accent/60 mt-0.5">{activeTab.hint}</p>
              </div>
              <button
                onClick={signOut}
                className="lg:hidden text-[13px] text-accent/70 hover:text-red-400 transition-colors flex items-center gap-1 flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign out
              </button>
            </div>

            {/* Account blocked notice */}
            {profile.is_blocked && (
              <div className="border border-red-500/40 bg-red-500/5 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-red-500/20 bg-red-500/10">
                  <span className="material-symbols-outlined text-red-400 text-[24px] flex-shrink-0">gpp_bad</span>
                  <div>
                    <p className="font-semibold text-[15px] text-red-400">Account blocked</p>
                    <p className="text-[12px] text-accent/70 mt-0.5 leading-relaxed">
                      You cannot add items to cart or place pre-orders while your account is blocked.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-red-400/80 mb-2">Reason</p>
                  {profile.block_reason ? (
                    <div
                      className="text-[13px] text-fg leading-relaxed prose-invert [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-primary [&_strong]:text-fg [&_p]:mb-2"
                      dangerouslySetInnerHTML={{ __html: profile.block_reason }}
                    />
                  ) : (
                    <p className="text-[13px] text-accent/60 italic">
                      No reason was provided. Please contact support for more information.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Email verification banner */}
            {!emailVerified && (
              <div className="flex items-start gap-3 border border-yellow-400/30 bg-yellow-400/5 rounded-lg px-4 py-3">
                <span className="material-symbols-outlined text-yellow-400 text-[18px] flex-shrink-0 mt-0.5">mark_email_unread</span>
                <div>
                  <p className="text-[13px] font-medium text-yellow-400">Verify your email address</p>
                  <p className="text-[12px] text-accent/70 mt-0.5 leading-relaxed">
                    Check your inbox and click the confirmation link to activate all account features.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Orders */}
            {tab === "orders" && (
              <>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  <Kpi label="Total orders" icon="receipt_long" value={orders.length.toLocaleString()} hint="All time" />
                  <Kpi label="Open orders" icon="pending_actions" value={openOrders.length.toLocaleString()} hint="Not yet completed" />
                  <Kpi label="Total spent" icon="payments" value={peso(spent)} hint="Completed orders" />
                  <Kpi label="Balance due" icon="account_balance_wallet" value={peso(balanceDue)} hint="Open orders, after down payments" />
                </div>

                <section className={`${CARD} overflow-hidden`}>
                  <CardHeader title="Order history" subtitle="Select an order to see its items, delivery and payment details." />
                  {orders.length === 0 ? (
                    <div className="text-center py-14 px-4">
                      <span className="material-symbols-outlined text-[32px] text-accent/40">shopping_bag</span>
                      <p className="text-[13px] text-accent/70 mt-2">No orders yet.</p>
                      <Link href="/" className="inline-block mt-3 text-[13px] text-primary hover:underline underline-offset-2">
                        Browse the store
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:grid grid-cols-[24px_120px_1fr_130px_120px] gap-3 px-4 py-2 border-b border-line/20 text-[10px] font-medium uppercase tracking-wider text-accent/60">
                        <span />
                        <span>Date</span>
                        <span>Items</span>
                        <span>Status</span>
                        <span className="text-right">Total</span>
                      </div>
                      <ul className="divide-y divide-line/15">
                        {orders.map(order => {
                          const open = expanded === order.id;
                          return (
                            <li key={order.id}>
                              <button
                                type="button"
                                onClick={() => setExpanded(open ? null : order.id)}
                                aria-expanded={open}
                                className={`w-full text-left rounded-none grid grid-cols-[24px_1fr_auto] md:grid-cols-[24px_120px_1fr_130px_120px] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors ${
                                  open ? "bg-fg/[0.03]" : "hover:bg-fg/[0.03]"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[18px] text-accent/50">
                                  {open ? "expand_less" : "expand_more"}
                                </span>
                                <span className="text-[13px] text-fg tabular-nums">
                                  {formatDate(order.created_at)}
                                  {order.order_number != null && (
                                    <span className="block text-[11px] text-accent/60">#{order.order_number}</span>
                                  )}
                                </span>
                                <span className="hidden md:block min-w-0 text-[12px] text-accent/70 truncate">
                                  {order.items.map(it => `${it.product} ×${it.qty}`).join(", ")}
                                </span>
                                <span className="col-start-2 md:col-start-auto row-start-2 md:row-start-auto">
                                  <StatusBadge status={order.status} />
                                </span>
                                <span className="col-start-3 row-start-1 row-span-2 md:row-span-1 md:col-start-auto md:row-start-auto justify-self-end">
                                  <OrderTotalInline order={order} />
                                </span>
                              </button>

                              {open && (
                                <div className="border-t border-line/20 bg-deep/60 px-4 md:px-6 py-4 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">
                                  <div className="min-w-0">
                                    <table className="w-full text-[13px]">
                                      <thead>
                                        <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-accent/60 border-b border-line/20">
                                          <th className="py-2 pr-2 font-medium" colSpan={2}>Item</th>
                                          <th className="py-2 font-medium text-center w-12">Qty</th>
                                          <th className="py-2 font-medium text-right">Subtotal</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-line/10">
                                        {order.items.map((item, i) => (
                                          <tr key={i}>
                                            <td className="py-2 pr-3 w-9">
                                              {item.slug ? (
                                                <Link href={`/product/${item.slug}`}>
                                                  <ItemThumb src={item.image} alt={item.product} />
                                                </Link>
                                              ) : (
                                                <ItemThumb src={item.image} alt={item.product} />
                                              )}
                                            </td>
                                            <td className="py-2 text-fg">
                                              {item.slug ? (
                                                <Link href={`/product/${item.slug}`} className="hover:text-primary hover:underline underline-offset-2 transition-colors">
                                                  {item.product}
                                                </Link>
                                              ) : (
                                                item.product
                                              )}
                                            </td>
                                            <td className="py-2 text-center text-accent/70 tabular-nums">×{item.qty}</td>
                                            <td className="py-2 text-right text-fg tabular-nums">{peso(item.subtotal)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {order.notes?.length > 0 && (
                                      <div className="mt-4 space-y-1.5">
                                        <p className="text-[10px] font-medium uppercase tracking-wider text-accent/60">Notes</p>
                                        {order.notes.map((note, i) => (
                                          <p key={i} className="text-[12px] text-accent/80 leading-relaxed">{note}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <dl className="space-y-2 text-[12px] md:border-l md:border-line/20 md:pl-5">
                                    {order.delivery_method && (
                                      <div className="flex justify-between gap-3">
                                        <dt className="text-accent/70">Delivery</dt>
                                        <dd className="text-fg text-right">{order.delivery_method}</dd>
                                      </div>
                                    )}
                                    {order.delivery_method && order.tracking_number && (
                                      <div className="flex justify-between gap-3">
                                        <dt className="text-accent/70">Tracking</dt>
                                        <dd className="text-right tabular-nums break-all">
                                          {(() => {
                                            const url = getTrackingUrl(order.delivery_method!, order.tracking_number!);
                                            return url
                                              ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-2">{order.tracking_number}</a>
                                              : <span className="text-fg">{order.tracking_number}</span>;
                                          })()}
                                        </dd>
                                      </div>
                                    )}
                                    {order.payment_method && (
                                      <div className="flex justify-between gap-3">
                                        <dt className="text-accent/70">Payment</dt>
                                        <dd className="text-fg text-right">{order.payment_method}</dd>
                                      </div>
                                    )}
                                    {order.delivery_method && order.delivery_method !== "Pickup" && (
                                      <div className="flex justify-between gap-3">
                                        <dt className="text-accent/70">Shipping fee</dt>
                                        <dd className="text-fg tabular-nums">{order.shipping_fee != null ? peso(order.shipping_fee) : "TBA"}</dd>
                                      </div>
                                    )}
                                    {order.discount > 0 && (
                                      <div className="flex justify-between gap-3">
                                        <dt className="text-accent/70">Discount</dt>
                                        <dd className="text-emerald-400 tabular-nums">−{peso(order.discount)}</dd>
                                      </div>
                                    )}
                                    {hasOpenDownPayment(order) && (
                                      <div className="flex justify-between gap-3">
                                        <dt className="text-accent/70">Down payment</dt>
                                        <dd className="text-fg tabular-nums">{peso(order.down_payment ?? 0)}</dd>
                                      </div>
                                    )}
                                    <div className="flex justify-between gap-3 pt-2 mt-1 border-t border-line/20 text-[13px]">
                                      <dt className="text-fg font-medium">{hasOpenDownPayment(order) ? "Remaining balance" : "Total"}</dt>
                                      <dd className="text-fg font-semibold tabular-nums">
                                        {peso(hasOpenDownPayment(order) ? remainingOf(order) : order.estimated_total)}
                                      </dd>
                                    </div>
                                  </dl>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </section>
              </>
            )}

            {/* Tab: Profile */}
            {tab === "info" && (
              <>
                <section className={CARD}>
                  <CardHeader title="Personal information" />
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>First name</label>
                      <input value={profile.first_name} onChange={e => set$("first_name", e.target.value)} placeholder="Juan" className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Last name</label>
                      <input value={profile.last_name} onChange={e => set$("last_name", e.target.value)} placeholder="Dela Cruz" className={INPUT} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL}>Email</label>
                      <input value={profile.email} disabled placeholder="—" className={`${INPUT} opacity-50 cursor-not-allowed`} />
                      <p className="text-[11px] text-accent/60 mt-1">Email cannot be changed here.</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL}>Facebook link <span className="text-red-400">*</span></label>
                      <input
                        value={profile.facebook_url}
                        onChange={e => { set$("facebook_url", e.target.value); if (facebookError) setFacebookError(""); }}
                        onBlur={() => setFacebookError(validateFacebook(profile.facebook_url))}
                        placeholder="https://facebook.com/username"
                        className={`${INPUT} ${facebookError ? "border-red-500/70" : ""}`}
                      />
                      {facebookError && <p className="text-[11px] text-red-400 mt-1">{facebookError}</p>}
                    </div>
                  </div>
                </section>

                <section className={CARD}>
                  <CardHeader title="Change password" />
                  <form onSubmit={changePassword} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>New password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Confirm password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className={INPUT}
                      />
                    </div>
                    {pwError && <p className="sm:col-span-2 text-[12px] text-red-400">{pwError}</p>}
                    {pwMsg && <p className="sm:col-span-2 text-[12px] text-emerald-400">{pwMsg}</p>}
                    <div className="sm:col-span-2">
                      <button type="submit" disabled={pwSaving} className={PRIMARY_BTN}>
                        {pwSaving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                        {pwSaving ? "Updating…" : "Update password"}
                      </button>
                    </div>
                  </form>
                </section>
              </>
            )}

            {/* Tab: Billing */}
            {tab === "billing" && (
              <section className={CARD}>
                <CardHeader title="Billing address" />
                <div className="p-5">
                  <AddressFields prefix="billing" profile={profile} set$={set$} />
                </div>
              </section>
            )}

            {/* Tab: Shipping */}
            {tab === "shipping" && (
              <section className={CARD}>
                <CardHeader
                  title="Shipping address"
                  action={
                    <button
                      onClick={copyBillingToShipping}
                      className="text-[12px] text-accent/70 hover:text-primary transition-colors flex items-center gap-1 px-2 py-1 border border-line/40"
                    >
                      <span className="material-symbols-outlined text-[15px]">content_copy</span>
                      Copy from billing
                    </button>
                  }
                />
                <div className="p-5">
                  <AddressFields prefix="shipping" profile={profile} set$={set$} />
                </div>
              </section>
            )}

            {/* Save button (not on orders tab) */}
            {tab !== "orders" && (
              <div className="flex items-center gap-4">
                <button onClick={save} disabled={saving} className={PRIMARY_BTN}>
                  {saving
                    ? <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    : <span className="material-symbols-outlined text-[16px]">save</span>}
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {saveMsg && <span className="text-[12px] text-emerald-400">{saveMsg}</span>}
                {saveError && <span className="text-[12px] text-red-400">{saveError}</span>}
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageInner />
    </Suspense>
  );
}

type StringProfileKey = { [K in keyof Profile]: Profile[K] extends string ? K : never }[keyof Profile];

function AddressFields({
  prefix,
  profile,
  set$,
}: {
  prefix: "billing" | "shipping";
  profile: Profile;
  set$: (key: keyof Profile, value: string) => void;
}) {
  const f = (field: string) => `${prefix}_${field}` as StringProfileKey;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={LABEL}>Address line 1</label>
        <input value={profile[f("address_1")]} onChange={e => set$(f("address_1"), e.target.value)} placeholder="House No., Street" className={INPUT} />
      </div>
      <div className="sm:col-span-2">
        <label className={LABEL}>Address line 2</label>
        <input value={profile[f("address_2")]} onChange={e => set$(f("address_2"), e.target.value)} placeholder="Barangay, Subdivision" className={INPUT} />
      </div>
      <ProvinceCityNameFields
        prefix={prefix}
        state={profile[f("state")]}
        city={profile[f("city")]}
        onChange={({ state, city }) => { set$(f("state"), state); set$(f("city"), city); }}
        inputClass={() => INPUT}
        labelClass={LABEL}
      />
      <div>
        <label className={LABEL}>Postcode / ZIP</label>
        <input value={profile[f("postcode")]} onChange={e => set$(f("postcode"), e.target.value)} placeholder="1234" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Region</label>
        <input value={profile[f("region")]} onChange={e => set$(f("region"), e.target.value)} placeholder="Philippines" className={INPUT} />
      </div>
      <div className="sm:col-span-2">
        <label className={LABEL}>Phone</label>
        <input value={profile[f("phone")]} onChange={e => set$(f("phone"), e.target.value)} placeholder="+63 9XX XXX XXXX" className={INPUT} />
      </div>
    </div>
  );
}
