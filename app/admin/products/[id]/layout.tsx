import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Product" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
