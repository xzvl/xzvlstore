import type { Metadata } from "next";
import AdminShell from "./AdminShell";
import ForceThemeMode from "@/components/admin/ForceThemeMode";
import { getSiteContent } from "@/lib/get-site-content";

export const metadata: Metadata = {
  title: {
    template: "%s - Backend - xzvl.store",
    default: "Dashboard - Backend",
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { colors } = await getSiteContent();
  // .erp-theme pins the default mode's palette from /admin/content → Colors, so
  // the visitor's header toggle never restyles the admin panel.
  return (
    <div className="erp-theme min-h-screen bg-deep text-fg">
      <ForceThemeMode mode={colors.defaultMode} />
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
