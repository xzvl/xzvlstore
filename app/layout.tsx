import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { getSiteContent, isMaintenanceForced } from "@/lib/get-site-content";
import { SiteContentProvider } from "@/components/SiteContentProvider";
import MaintenanceGate from "@/components/MaintenanceGate";
import HoldPreOrderReminder from "@/components/HoldPreOrderReminder";
import { THEME_INIT_SCRIPT, themeCss } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Async so the favicon can come from /admin/content's Branding tab (falls back
// to the default when none is set).
export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getSiteContent();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://xzvl.store"),
    title: {
      template: "%s - xzvl.store",
      default: "xzvl.store",
    },
    description: "xzvl.store",
    icons: {
      icon: branding.faviconUrl || "/assets/favicon.webp",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteContent = await getSiteContent();

  return (
    <html
      lang="en"
      data-theme={siteContent.colors.defaultMode}
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      // The init script may switch data-theme to the visitor's saved mode before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: themeCss(siteContent.colors) }} />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="overflow-x-clip">
        <div className="fixed inset-0 scanline z-[100] pointer-events-none" />
        <CartProvider>
          <SiteContentProvider value={siteContent}>
            <MaintenanceGate forced={isMaintenanceForced()}>
              {children}
              <HoldPreOrderReminder />
            </MaintenanceGate>
          </SiteContentProvider>
        </CartProvider>
      </body>
    </html>
  );
}
