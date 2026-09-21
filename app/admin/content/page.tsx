"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteContent } from "@/lib/site-content";
import BrandingTab from "./_BrandingTab";
import HeaderTab from "./_HeaderTab";
import HeroTab from "./_HeroTab";
import FooterTab from "./_FooterTab";

const TABS = [
  { key: "branding", label: "Branding", icon: "image" },
  { key: "header", label: "Header", icon: "web_asset" },
  { key: "hero", label: "Hero", icon: "slideshow" },
  { key: "footer", label: "Footer", icon: "vertical_align_bottom" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function ClearCacheButton() {
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function clearCache() {
    setClearing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/revalidate", { method: "POST" });
      if (!res.ok) throw new Error();
      setResult({ ok: true, text: "Cache cleared — pages will rebuild on their next visit." });
    } catch {
      setResult({ ok: false, text: "Failed to clear the cache." });
    } finally {
      setClearing(false);
      setTimeout(() => setResult(null), 5000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className={`font-mono text-[11px] flex items-center gap-1 ${result.ok ? "text-green-400" : "text-primary"}`}>
          <span className="material-symbols-outlined text-[14px]">{result.ok ? "check_circle" : "error"}</span>
          {result.text}
        </span>
      )}
      <button
        type="button"
        onClick={clearCache}
        disabled={clearing}
        title="Purge the cached storefront pages (Vercel) so they re-fetch the latest data from Supabase"
        className="flex items-center gap-2 px-4 py-2 border border-[#603e39]/60 text-[#ebbbb4]/60 font-mono text-[10px] tracking-widest uppercase hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
      >
        <span className={`material-symbols-outlined text-[14px] ${clearing ? "animate-spin" : ""}`}>
          {clearing ? "progress_activity" : "cleaning_services"}
        </span>
        Clear Cache
      </button>
    </div>
  );
}

export default function AdminContentPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [active, setActive] = useState<TabKey>("branding");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/site-content", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setContent)
      .catch(() => setLoadError(true));
  }, []);

  if (loadError) {
    return <p className="font-mono text-[12px] text-primary py-8">Failed to load site content.</p>;
  }

  if (!content) {
    return (
      <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-8">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-1 uppercase">ADMIN // SITE CONTENT</p>
          <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">Site Content</h1>
          <p className="font-mono text-[11px] text-[#ebbbb4]/40 mt-1">
            Edit the storefront&apos;s logo, menus, homepage hero and footer. Saving refreshes the live pages automatically.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ClearCacheButton />
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 border border-[#603e39]/60 text-[#ebbbb4]/60 font-mono text-[10px] tracking-widest uppercase hover:border-primary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            Preview Site
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible w-full lg:w-48 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-[#603e39]/30 pb-2 lg:pb-0 lg:pr-4 scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`flex items-center gap-2 px-3 py-2.5 font-mono text-[11px] tracking-widest uppercase transition-colors whitespace-nowrap flex-shrink-0 lg:w-full border-l-2 ${
                active === t.key
                  ? "text-primary border-primary bg-primary/5"
                  : "text-[#ebbbb4]/50 border-transparent hover:text-[#e2e2e2] hover:bg-[#1a1a1a]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0 w-full">
          {active === "branding" && (
            <BrandingTab initial={content.branding} onSaved={(branding) => setContent((c) => c && { ...c, branding })} />
          )}
          {active === "header" && (
            <HeaderTab initial={content.header} onSaved={(header) => setContent((c) => c && { ...c, header })} />
          )}
          {active === "hero" && (
            <HeroTab initial={content.hero} onSaved={(hero) => setContent((c) => c && { ...c, hero })} />
          )}
          {active === "footer" && (
            <FooterTab initial={content.footer} onSaved={(footer) => setContent((c) => c && { ...c, footer })} />
          )}
        </div>
      </div>
    </div>
  );
}
