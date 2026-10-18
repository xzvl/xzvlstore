import type { Metadata } from "next";
import ForceThemeMode from "@/components/admin/ForceThemeMode";
import AccountProvider from "@/components/account/AccountProvider";
import { getSiteContent } from "@/lib/get-site-content";

export const metadata: Metadata = { title: "My Account" };

// Same ERP palette as /admin: the default mode from /admin/content → Colors.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const { colors } = await getSiteContent();
  return (
    <div className="erp-theme bg-deep text-fg">
      <ForceThemeMode mode={colors.defaultMode} />
      <AccountProvider>{children}</AccountProvider>
    </div>
  );
}
