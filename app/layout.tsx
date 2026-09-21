import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { getSiteContent } from "@/lib/get-site-content";
import { SiteContentProvider } from "@/components/SiteContentProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
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
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="overflow-x-clip">
        <div className="fixed inset-0 scanline z-[100] pointer-events-none" />
        <CartProvider>
          <SiteContentProvider value={siteContent}>{children}</SiteContentProvider>
        </CartProvider>
      </body>
    </html>
  );
}
