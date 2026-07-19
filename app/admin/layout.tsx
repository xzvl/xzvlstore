"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/orders", label: "Orders", icon: "receipt_long" },
  { href: "/admin/products", label: "Products", icon: "inventory_2" },
  { href: "/admin/customers", label: "Customers", icon: "group" },
  { href: "/admin/ledger", label: "Ledger", icon: "account_balance_wallet" },
  { href: "/admin/bir", label: "BIR Tax", icon: "request_quote" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
  { href: "/admin/taxonomy", label: "Taxonomy", icon: "account_tree" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#0e0e0e] flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden border-b border-[#603e39]/30 bg-[#131313] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center justify-center text-[#ebbbb4]/60 hover:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-[22px]">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
          <span className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase select-none">
            XZVL_ADMIN
          </span>
        </div>
        <button
          onClick={logout}
          className="font-mono text-[11px] text-[#ebbbb4]/40 hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[13px]">logout</span>
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
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
                const active = isActive(pathname, item.href);
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

      {/* Desktop left sidebar */}
      <aside className={`hidden md:flex md:flex-col ${collapsed ? "w-16" : "w-56"} flex-shrink-0 md:h-full bg-[#131313] border-r border-[#603e39]/30 transition-all duration-200`}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#603e39]/30">
          {!collapsed && (
            <span className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase select-none">
              XZVL_ADMIN
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`text-[#ebbbb4]/50 hover:text-primary transition-colors flex-shrink-0 ${collapsed ? "mx-auto" : ""}`}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {collapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>
        <nav className="flex flex-col px-3 py-4 gap-1 flex-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 py-2.5 font-mono text-[11px] tracking-widest uppercase transition-colors border-l-2 ${collapsed ? "justify-center px-2" : "px-4"} ${
                  active
                    ? "text-primary border-primary bg-primary/5"
                    : "text-[#ebbbb4]/50 border-transparent hover:text-[#e2e2e2] hover:bg-[#1a1a1a]"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-[#603e39]/30 flex flex-col gap-1">
          <Link
            href="/"
            target="_blank"
            title={collapsed ? "View Store" : undefined}
            className={`flex items-center gap-3 py-2.5 font-mono text-[11px] text-[#ebbbb4]/40 hover:text-primary transition-colors border-l-2 border-transparent hover:bg-[#1a1a1a] ${collapsed ? "justify-center px-2" : "px-4"}`}
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            {!collapsed && "View Store"}
          </Link>
          <button
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            className={`flex items-center gap-3 py-2.5 font-mono text-[11px] text-[#ebbbb4]/40 hover:text-primary transition-colors border-l-2 border-transparent hover:bg-[#1a1a1a] w-full text-left ${collapsed ? "justify-center px-2" : "px-4"}`}
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 min-w-0 md:h-full md:overflow-y-auto">{children}</main>
    </div>
  );
}
