"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Order } from "@/lib/supabase";
import type { ListedProduct } from "@/lib/account-list";
import { CARD, PRIMARY_BTN } from "./ui";

export type Profile = {
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

export const validateFacebook = (v: string) => {
  if (!v.trim()) return "Facebook link is required.";
  if (!/^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/.+/i.test(v.trim())) return "Enter a valid Facebook profile link.";
  return "";
};

type ListName = "favorites" | "waitlist";

type AccountContextValue = {
  profile: Profile;
  setField: (key: keyof Profile, value: string) => void;
  copyBillingToShipping: () => void;
  /** Saves the profile. Returns false (and sets an error) if validation or the request fails. */
  save: () => Promise<boolean>;
  saving: boolean;
  saveMsg: string;
  saveError: string;
  facebookError: string;
  setFacebookError: (v: string) => void;
  orders: Order[];
  favorites: ListedProduct[];
  waitlist: ListedProduct[];
  removeFromList: (list: ListName, productId: string) => Promise<void>;
  emailVerified: boolean;
  signOut: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}

type NavItem = { href: string; label: string; icon: string; hint: string };

const NAV: NavItem[] = [
  { href: "/account", label: "Dashboard", icon: "dashboard", hint: "Your account at a glance" },
  { href: "/account/orders", label: "Orders", icon: "receipt_long", hint: "Order history and tracking" },
  { href: "/account/favorites", label: "Favorites", icon: "favorite", hint: "Products you've favorited" },
  { href: "/account/waitlist", label: "Waitlist", icon: "notifications", hint: "Products you're waiting on" },
  { href: "/account/profile", label: "Profile", icon: "person", hint: "Personal details and password" },
  { href: "/account/billing", label: "Billing", icon: "credit_card", hint: "Billing address" },
  { href: "/account/shipping", label: "Shipping", icon: "local_shipping", hint: "Delivery address" },
];

export default function AccountProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<ListedProduct[]>([]);
  const [waitlist, setWaitlist] = useState<ListedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  const [facebookError, setFacebookError] = useState("");

  useEffect(() => {
    let cancelled = false;

    // A rejected fetch (a network blip, an aborted request) used to throw out of
    // this callback unhandled, skipping setLoading(false) below and leaving the
    // spinner stuck forever — Promise.allSettled + try/finally guarantees it
    // always resolves, with each list simply falling back to empty on failure.
    supabaseClient.auth.getSession()
      .then(async ({ data }) => {
        if (!data.session) { router.replace("/auth/login"); return; }
        try {
          const t = data.session.access_token;
          setToken(t);
          setEmailVerified(!!data.session.user.email_confirmed_at);
          const headers = { Authorization: `Bearer ${t}` };
          const [profileRes, ordersRes, favRes, waitRes] = await Promise.allSettled([
            fetch("/api/account/profile", { headers }),
            fetch("/api/account/orders", { headers }),
            fetch("/api/account/favorites", { headers }),
            fetch("/api/account/waitlist", { headers }),
          ]);
          if (profileRes.status === "fulfilled" && profileRes.value.ok) {
            setProfile({ ...EMPTY_PROFILE, ...(await profileRes.value.json()) });
          }
          if (ordersRes.status === "fulfilled" && ordersRes.value.ok) setOrders(await ordersRes.value.json());
          if (favRes.status === "fulfilled" && favRes.value.ok) setFavorites(await favRes.value.json());
          if (waitRes.status === "fulfilled" && waitRes.value.ok) setWaitlist(await waitRes.value.json());
        } catch (err) {
          console.error("[account] failed to load account data:", err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })
      .catch((err) => {
        console.error("[account] failed to get session:", err);
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [router]);

  const setField = useCallback((key: keyof Profile, value: string) =>
    setProfile((p) => ({ ...p, [key]: value })), []);

  const copyBillingToShipping = useCallback(() =>
    setProfile((p) => ({
      ...p,
      shipping_address_1: p.billing_address_1,
      shipping_address_2: p.billing_address_2,
      shipping_city: p.billing_city,
      shipping_postcode: p.billing_postcode,
      shipping_region: p.billing_region,
      shipping_state: p.billing_state,
      shipping_phone: p.billing_phone,
    })), []);

  const save = useCallback(async () => {
    const facebookErr = validateFacebook(profile.facebook_url);
    if (facebookErr) {
      setFacebookError(facebookErr);
      setSaveError(facebookErr);
      // The Facebook field lives on the profile page.
      if (pathname !== "/account/profile") router.push("/account/profile");
      return false;
    }
    setFacebookError("");
    setSaving(true);
    setSaveMsg(""); setSaveError("");
    const res = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile),
    });
    let ok = res.ok;
    if (ok) {
      setSaveMsg("Saved successfully.");
      setTimeout(() => setSaveMsg(""), 3000);
    } else {
      const json = await res.json().catch(() => ({}));
      setSaveError(json.error ?? "Failed to save.");
      ok = false;
    }
    setSaving(false);
    return ok;
  }, [profile, token, pathname, router]);

  const removeFromList = useCallback(async (list: ListName, productId: string) => {
    const setter = list === "favorites" ? setFavorites : setWaitlist;
    const previous = list === "favorites" ? favorites : waitlist;
    setter(previous.filter((p) => p.id !== productId));
    const res = await fetch(`/api/account/${list}?product_id=${encodeURIComponent(productId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) setter(previous);
  }, [token, favorites, waitlist]);

  const signOut = useCallback(async () => {
    await supabaseClient.auth.signOut();
    router.push("/auth/login");
  }, [router]);

  // Clear stale save feedback when moving between pages.
  useEffect(() => { setSaveMsg(""); setSaveError(""); }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-deep flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-[24px]">progress_activity</span>
      </div>
    );
  }

  const active =
    NAV.find((n) => n.href === pathname) ??
    NAV.filter((n) => n.href !== "/account" && pathname.startsWith(`${n.href}/`))[0] ??
    NAV[0];

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const initials = (fullName || profile.email || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const badge = (href: string) =>
    href === "/account/orders" ? orders.length
    : href === "/account/favorites" ? favorites.length
    : href === "/account/waitlist" ? waitlist.length
    : 0;

  return (
    <AccountContext.Provider
      value={{
        profile, setField, copyBillingToShipping, save, saving, saveMsg, saveError,
        facebookError, setFacebookError, orders, favorites, waitlist, removeFromList,
        emailVerified, signOut,
      }}
    >
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
                {NAV.map((n) => {
                  const isActive = n.href === active.href;
                  const count = badge(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`relative flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors whitespace-nowrap flex-shrink-0 ${
                        isActive ? "bg-primary/10 text-fg font-medium" : "text-accent/80 hover:text-fg hover:bg-fg/[0.04]"
                      }`}
                    >
                      {isActive && <span className="hidden lg:block absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary" />}
                      <span className={`material-symbols-outlined text-[18px] ${isActive ? "text-primary" : "text-accent/60"}`}>{n.icon}</span>
                      {n.label}
                      {count > 0 && (
                        <span className="ml-auto pl-2 text-[11px] text-accent/60 tabular-nums">{count}</span>
                      )}
                    </Link>
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
                  <h1 className="text-[22px] font-semibold text-fg tracking-tight">{active.label}</h1>
                  <p className="text-[13px] text-accent/60 mt-0.5">{active.hint}</p>
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

              {children}
            </main>
          </div>
        </div>

        <Footer />
      </div>
    </AccountContext.Provider>
  );
}

/** Save button + feedback shown under the profile / billing / shipping forms. */
export function SaveBar() {
  const { save, saving, saveMsg, saveError } = useAccount();
  return (
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
  );
}
