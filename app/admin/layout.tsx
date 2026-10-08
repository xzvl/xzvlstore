import type { Metadata } from "next";
import AdminShell from "./AdminShell";
import ForceDarkMode from "@/components/admin/ForceDarkMode";

export const metadata: Metadata = {
  title: {
    template: "%s - Backend - xzvl.store",
    default: "Dashboard - Backend",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // .admin-theme pins the Dark Mode palette from /admin/content → Colors, so the
  // storefront's light mode never restyles the admin panel.
  return (
    <div className="admin-theme min-h-screen bg-deep text-fg">
      <ForceDarkMode />
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
