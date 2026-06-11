import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pre-Order" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
