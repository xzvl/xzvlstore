"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Order } from "@/lib/supabase";

type Tab = "info" | "billing" | "shipping" | "orders";

type Profile = {
  first_name: string; last_name: string; email: string;
  billing_address_1: string; billing_address_2: string; billing_city: string;
  billing_postcode: string; billing_region: string; billing_state: string; billing_phone: string;
  shipping_address_1: string; shipping_address_2: string; shipping_city: string;
  shipping_postcode: string; shipping_region: string; shipping_state: string; shipping_phone: string;
};

const EMPTY_PROFILE: Profile = {
  first_name: "", last_name: "", email: "",
  billing_address_1: "", billing_address_2: "", billing_city: "",
  billing_postcode: "", billing_region: "Philippines", billing_state: "", billing_phone: "",
  shipping_address_1: "", shipping_address_2: "", shipping_city: "",
  shipping_postcode: "", shipping_region: "Philippines", shipping_state: "", shipping_phone: "",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  "pre-order": "text-purple-400 border-purple-400/30 bg-purple-400/10",
  processing: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  confirmed: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  shipped: "text-green-400 border-green-400/30 bg-green-400/10",
  completed: "text-primary border-primary/30 bg-primary/10",
  cancelled: "text-[#ebbbb4]/40 border-[#ebbbb4]/20 bg-[#ebbbb4]/5",
};

const INPUT = "w-full bg-[#1f1f1f] border border-[#603e39] text-[#e2e2e2] font-mono text-[13px] px-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-[#ebbbb4]/20";
const LABEL = "block font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/60 mb-1.5";

export default function AccountPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  const [token, setToken] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    supabaseClient.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/auth/login"); return; }
      const t = data.session.access_token;
      setToken(t);
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
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-[24px]">progress_activity</span>
      </div>
    );
  }

  const TABS: { value: Tab; label: string; icon: string }[] = [
    { value: "orders", label: "Orders", icon: "receipt_long" },
    { value: "info", label: "My Info", icon: "person" },
    { value: "billing", label: "Billing", icon: "credit_card" },
    { value: "shipping", label: "Shipping", icon: "local_shipping" },
  ];

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex flex-col">
      <Header />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-1">Account</p>
            <h1 className="font-inter font-black text-[26px] uppercase text-[#e2e2e2]">
              {profile.first_name ? `${profile.first_name} ${profile.last_name}`.trim() : "My Account"}
            </h1>
          </div>
          <button
            onClick={signOut}
            className="font-mono text-[11px] text-[#ebbbb4]/40 hover:text-primary transition-colors flex items-center gap-1 flex-shrink-0 mt-1"
          >
            <span className="material-symbols-outlined text-[14px]">logout</span>
            Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[#603e39]/30 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
                tab === t.value ? "text-primary border-primary" : "text-[#ebbbb4]/40 border-transparent hover:text-[#e2e2e2]"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">{t.icon}</span>
              {t.label}
              {t.value === "orders" && orders.length > 0 && (
                <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded-full">{orders.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: My Info */}
        {tab === "info" && (
          <div className="space-y-4">
            {/* Personal info */}
            <div className="bg-[#131313] border border-[#603e39]/30 p-6 space-y-4">
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Personal Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>First Name</label>
                  <input value={profile.first_name} onChange={e => set$("first_name", e.target.value)} placeholder="Juan" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Last Name</label>
                  <input value={profile.last_name} onChange={e => set$("last_name", e.target.value)} placeholder="Dela Cruz" className={INPUT} />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Email</label>
                  <input value={profile.email} disabled placeholder="—" className={`${INPUT} opacity-50 cursor-not-allowed`} />
                  <p className="font-mono text-[10px] text-[#ebbbb4]/30 mt-1">Email cannot be changed here.</p>
                </div>
              </div>
            </div>

            {/* Change password */}
            <div className="bg-[#131313] border border-[#603e39]/30 p-6 space-y-4">
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Change Password</p>
              <form onSubmit={changePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={INPUT}
                  />
                </div>
                {pwError && <p className="sm:col-span-2 font-mono text-[11px] text-red-400">{pwError}</p>}
                {pwMsg && <p className="sm:col-span-2 font-mono text-[11px] text-green-400">{pwMsg}</p>}
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={pwSaving}
                    className="px-6 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {pwSaving && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
                    {pwSaving ? "Updating…" : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab: Billing */}
        {tab === "billing" && (
          <div className="bg-[#131313] border border-[#603e39]/30 p-6 space-y-4">
            <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Billing Address</p>
            <AddressFields prefix="billing" profile={profile} set$={set$} />
          </div>
        )}

        {/* Tab: Shipping */}
        {tab === "shipping" && (
          <div className="bg-[#131313] border border-[#603e39]/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Shipping Address</p>
              <button
                onClick={copyBillingToShipping}
                className="font-mono text-[10px] text-[#ebbbb4]/40 hover:text-primary transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">content_copy</span>
                Copy from billing
              </button>
            </div>
            <AddressFields prefix="shipping" profile={profile} set$={set$} />
          </div>
        )}

        {/* Tab: Orders */}
        {tab === "orders" && (
          <div className="space-y-2">
            {orders.length === 0 ? (
              <div className="text-center py-16 font-mono text-[13px] text-[#ebbbb4]/30">No orders yet.</div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-[#131313] border border-[#603e39]/30 overflow-hidden">
                  <div
                    className="flex flex-wrap items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  >
                    <span className="material-symbols-outlined text-[14px] text-[#ebbbb4]/30">
                      {expanded === order.id ? "expand_less" : "expand_more"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[11px] text-[#ebbbb4]/40">{formatDate(order.created_at)}</p>
                      {order.items.length > 0 && (
                        <p className="font-mono text-[10px] text-[#ebbbb4]/30 truncate mt-0.5">
                          {order.items.map(it => `${it.product} ×${it.qty}`).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="font-mono text-[13px] text-primary font-bold">
                      ₱{order.estimated_total.toLocaleString()}
                    </div>
                    <span className={`font-mono text-[10px] tracking-widest uppercase px-2 py-1 border ${STATUS_COLORS[order.status] ?? "text-[#ebbbb4]/40"}`}>
                      {order.status}
                    </span>
                  </div>
                  {expanded === order.id && (
                    <div className="border-t border-[#603e39]/30 px-4 py-4 bg-[#0e0e0e] space-y-3">
                      {order.delivery_method && (
                        <p className="font-mono text-[11px] text-[#ebbbb4]/50">
                          Delivery: <span className="text-[#e2e2e2]">{order.delivery_method}</span>
                        </p>
                      )}
                      {order.payment_method && (
                        <p className="font-mono text-[11px] text-[#ebbbb4]/50">
                          Payment: <span className="text-[#e2e2e2]">{order.payment_method}</span>
                        </p>
                      )}
                      <table className="w-full text-[12px] mt-2">
                        <tbody>
                          {order.items.map((item, i) => (
                            <tr key={i} className="border-b border-[#603e39]/10">
                              <td className="py-1.5 font-mono text-[#e2e2e2]">{item.product}</td>
                              <td className="py-1.5 text-center font-mono text-[#ebbbb4]/50 w-10">×{item.qty}</td>
                              <td className="py-1.5 text-right font-mono text-primary">₱{item.subtotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {order.discount > 0 && (
                        <div className="flex justify-between font-mono text-[11px]">
                          <span className="text-[#ebbbb4]/50">Discount</span>
                          <span className="text-green-400">−₱{order.discount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-mono text-[12px] pt-1 border-t border-[#603e39]/20">
                        <span className="text-[#ebbbb4]/50">Total</span>
                        <span className="text-primary font-bold">₱{order.estimated_total.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Save button (not on orders tab) */}
        {tab !== "orders" && (
          <div className="flex items-center gap-4">
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saveMsg && <span className="font-mono text-[11px] text-green-400">{saveMsg}</span>}
            {saveError && <span className="font-mono text-[11px] text-red-400">{saveError}</span>}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function AddressFields({
  prefix,
  profile,
  set$,
}: {
  prefix: "billing" | "shipping";
  profile: Profile;
  set$: (key: keyof Profile, value: string) => void;
}) {
  const f = (field: string) => `${prefix}_${field}` as keyof Profile;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={LABEL}>Address Line 1</label>
        <input value={profile[f("address_1")]} onChange={e => set$(f("address_1"), e.target.value)} placeholder="House No., Street" className={INPUT} />
      </div>
      <div className="sm:col-span-2">
        <label className={LABEL}>Address Line 2</label>
        <input value={profile[f("address_2")]} onChange={e => set$(f("address_2"), e.target.value)} placeholder="Barangay, Subdivision" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>City</label>
        <input value={profile[f("city")]} onChange={e => set$(f("city"), e.target.value)} placeholder="City" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>State / Province</label>
        <input value={profile[f("state")]} onChange={e => set$(f("state"), e.target.value)} placeholder="Province" className={INPUT} />
      </div>
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
