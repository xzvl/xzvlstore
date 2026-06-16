"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin/orders", label: "Orders", icon: "receipt_long" },
  { href: "/admin/products", label: "Products", icon: "inventory_2" },
  { href: "/admin/customers", label: "Customers", icon: "group" },
  { href: "/admin/ledger", label: "Ledger", icon: "account_balance_wallet" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
  { href: "/admin/taxonomy", label: "Taxonomy", icon: "account_tree" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex flex-col">
      {/* Top nav */}
      <header className="border-b border-[#603e39]/30 bg-[#131313] px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden flex items-center justify-center text-[#ebbbb4]/60 hover:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-[22px]">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>

          <span className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase select-none">
            XZVL_ADMIN
          </span>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
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

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          {/* Sidebar */}
          <aside className="fixed top-0 left-0 z-50 h-full w-64 bg-[#131313] border-r border-[#603e39]/30 flex flex-col md:hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#603e39]/30">
              <span className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase select-none">
                XZVL_ADMIN
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-[#ebbbb4]/50 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <nav className="flex flex-col px-3 py-4 gap-1 flex-1">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 font-mono text-[11px] tracking-widest uppercase transition-colors border-l-2 ${
                      active
                        ? "text-primary border-primary bg-primary/5"
                        : "text-[#ebbbb4]/50 border-transparent hover:text-[#e2e2e2] hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-[#603e39]/30 flex flex-col gap-1">
              <Link
                href="/"
                target="_blank"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 font-mono text-[11px] text-[#ebbbb4]/40 hover:text-primary transition-colors border-l-2 border-transparent hover:bg-[#1a1a1a]"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                View Store
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 font-mono text-[11px] text-[#ebbbb4]/40 hover:text-primary transition-colors border-l-2 border-transparent hover:bg-[#1a1a1a] w-full text-left"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Logout
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
