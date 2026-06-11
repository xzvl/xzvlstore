"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin/orders", label: "Orders", icon: "receipt_long" },
  { href: "/admin/products", label: "Products", icon: "inventory_2" },
  { href: "/admin/customers", label: "Customers", icon: "group" },
  { href: "/admin/ledger", label: "Ledger", icon: "account_balance_wallet" },
  { href: "/admin/taxonomy", label: "Taxonomy", icon: "account_tree" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex flex-col">
      {/* Top nav */}
      <header className="border-b border-[#603e39]/30 bg-[#131313] px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase select-none">
            XZVL_ADMIN
          </span>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] tracking-widest uppercase transition-colors ${
                    active
                      ? "text-primary border-b border-primary"
                      : "text-[#ebbbb4]/50 hover:text-[#e2e2e2]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            target="_blank"
            className="font-mono text-[11px] text-[#ebbbb4]/40 hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            Store
          </Link>
          <button
            onClick={logout}
            className="font-mono text-[11px] text-[#ebbbb4]/40 hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[13px]">logout</span>
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
