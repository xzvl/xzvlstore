"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSiteContent } from "@/components/SiteContentProvider";
import type { SocialPlatform } from "@/lib/site-content";

const SOCIAL_ICONS: Record<SocialPlatform, ReactNode> = {
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.77a4.85 4.85 0 0 1-1-.08z" />
      </svg>
  ),
  other: <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link</span>,
};

const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  other: "Link",
};

export default function Footer() {
  const { branding, footer } = useSiteContent();

  return (
    <footer className="bg-[#0e0e0e] border-t border-[#603e39]/30 mt-16">
      <div className="max-w-[1440px] mx-auto px-4 md:px-16 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <p className="font-inter font-black text-[24px] uppercase tracking-tight mb-3">
              {branding.logoImageUrl ? (
                <span className="relative block h-10 w-44">
                  <Image src={branding.logoImageUrl} alt="xzvl.store" fill sizes="176px" className="object-contain object-left" />
                </span>
              ) : (
                <>
                  <span className="text-[#e2e2e2]">xzvl</span>
                  <span className="text-primary">.</span>
                  <span className="text-[#e2e2e2]">store</span>
                </>
              )}
            </p>
            <p className="font-mono text-[11px] text-[#ebbbb4]/50 leading-relaxed max-w-xs whitespace-pre-line">
              {footer.description}
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary mb-4">
              Shop
            </p>
            <ul className="space-y-2.5">
              {footer.navLinks.map((link, i) => (
                <li key={`${link.href}-${i}`}>
                  <Link
                    href={link.href}
                    className="font-mono text-[12px] text-[#e2e2e2]/50 hover:text-primary transition-colors tracking-wide"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary mb-4">
              Follow Us
            </p>
            <div className="flex gap-3">
              {footer.socialLinks.map((s, i) => (
                <a
                  key={`${s.url}-${i}`}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL_LABELS[s.platform]}
                  className="w-9 h-9 border border-[#603e39]/50 flex items-center justify-center text-[#e2e2e2]/40 hover:text-primary hover:border-primary transition-all"
                >
                  {SOCIAL_ICONS[s.platform]}
                </a>
              ))}
            </div>
            {footer.socialNote && (
              <p className="font-mono text-[10px] text-[#ebbbb4]/30 mt-6 leading-relaxed">
                {footer.socialNote}
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#603e39]/20 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-mono text-[10px] tracking-widest text-[#e2e2e2]/20 uppercase">
            {footer.bottomText}
          </p>
          {footer.bottomTagline && (
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <p className="font-mono text-[10px] text-[#e2e2e2]/15 uppercase tracking-widest">
                {footer.bottomTagline}
              </p>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
