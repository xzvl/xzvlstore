import type { Metadata } from "next";

export const metadata: Metadata = { title: "Point of Sale" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
