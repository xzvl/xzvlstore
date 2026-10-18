"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSiteContent } from "@/components/SiteContentProvider";
import { useThemeMode } from "@/lib/use-theme-mode";
import { SOCIAL_ICONS, SOCIAL_LABELS } from "@/components/Footer";

// Wraps every page in the root layout. While maintenance mode is on (toggled
// in /admin/content → Maintenance), storefront pages render the maintenance
// screen instead of their content. /admin stays reachable so it can be
// switched back off. Rendered on the server too, so there's no flash.
// `forced` comes from the MAINTENANCE_MODE env var and overrides the toggle.
export default function MaintenanceGate({ forced, children }: { forced: boolean; children: ReactNode }) {
  const { maintenance } = useSiteContent();
  const pathname = usePathname() ?? "";

  if (!(forced || maintenance.enabled) || pathname.startsWith("/admin")) return <>{children}</>;
  return <MaintenancePage />;
}

function MaintenancePage() {
  const { branding, footer, maintenance } = useSiteContent();
  const mode = useThemeMode();
  const logo = (mode === "dark" && branding.logoImageUrlDark) || branding.logoImageUrl;

  return (
    <main className="relative min-h-screen bg-deep cyber-grid flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />

      <div className="w-full max-w-xl flex flex-col items-center text-center">
        <p className="font-inter font-black text-[24px] uppercase tracking-tight mb-10">
          {logo ? (
            <span className="relative block h-10 w-44">
              <Image src={logo} alt="xzvl.store" fill sizes="176px" className="object-contain" priority />
            </span>
          ) : (
            <>
              <span className="text-fg">xzvl</span>
              <span className="text-primary">.</span>
              <span className="text-fg">store</span>
            </>
          )}
        </p>

        {maintenance.image ? (
          <span className="relative block w-full max-w-sm aspect-[4/3] mb-8">
            <Image src={maintenance.image} alt="" fill sizes="384px" className="object-contain" priority />
          </span>
        ) : (
          <span className="material-symbols-outlined text-[64px] text-primary/70 mb-6">construction</span>
        )}

        {maintenance.tag && (
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary mb-3">{maintenance.tag}</p>
        )}
        <h1
          className="font-inter font-black uppercase leading-none tracking-tight text-fg"
          style={{ fontSize: "clamp(2rem, 6vw, 4rem)" }}
        >
          {maintenance.title}
        </h1>
        {maintenance.message && (
          <p className="font-mono text-[12px] text-accent/50 mt-5 leading-relaxed whitespace-pre-line">
            {maintenance.message}
          </p>
        )}

        {maintenance.showSocialLinks && footer.socialLinks.length > 0 && (
          <div className="flex gap-3 mt-10">
            {footer.socialLinks.map((s, i) => (
              <a
                key={`${s.url}-${i}`}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={SOCIAL_LABELS[s.platform]}
                className="w-9 h-9 border border-line/50 flex items-center justify-center text-fg/40 hover:text-primary hover:border-primary transition-all"
              >
                {SOCIAL_ICONS[s.platform]}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-6 flex gap-1.5 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <p className="font-mono text-[10px] text-fg/20 uppercase tracking-widest">{footer.bottomText}</p>
      </div>
    </main>
  );
}
