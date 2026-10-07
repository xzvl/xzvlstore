import type { Metadata } from "next";
import AdminShell from "./AdminShell";

export const metadata: Metadata = {
  title: {
    template: "%s - Backend - xzvl.store",
    default: "Dashboard - Backend",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // .admin-theme pins the built-in dark palette, so the storefront's light mode
  // and custom Colors never restyle the admin panel.
  return (
    <div className="admin-theme min-h-screen bg-[#0e0e0e] text-[#e2e2e2]">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
