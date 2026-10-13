import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bundle Products" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
