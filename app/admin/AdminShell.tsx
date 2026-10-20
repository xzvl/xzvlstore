"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSiteContent } from "@/components/SiteContentProvider";

type NavItem = { href: string; label: string; icon: string };

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: "space_dashboard" },
      { href: "/admin/analytics", label: "Analytics", icon: "monitoring" },
    ],
  },
  {
    group: "Sales",
    items: [
      { href: "/admin/pos", label: "Point of Sale", icon: "point_of_sale" },
      { href: "/admin/orders", label: "Orders", icon: "receipt_long" },
      { href: "/admin/customers", label: "Customers", icon: "group" },
    ],
  },
  {
    group: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: "inventory_2" },
      { href: "/admin/bundle-products", label: "Bundle Products", icon: "package_2" },
      { href: "/admin/taxonomy", label: "Taxonomy", icon: "account_tree" },
    ],
  },
  {
    group: "Finance",
    items: [
      { href: "/admin/ledger", label: "Ledger", icon: "account_balance_wallet" },
      { href: "/admin/bir", label: "BIR Tax", icon: "request_quote" },
    ],
  },
  {
    group: "Settings",
    items: [{ href: "/admin/content", label: "Site Content", icon: "web" }],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);
const COLLAPSED_KEY = "admin-sidebar-collapsed";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Brand({ compact = false }: { compact?: boolean }) {
  const { branding, colors } = useSiteContent();
  // /admin is pinned to Colors → Default mode (ForceThemeMode), never the
  // visitor's own toggle, so the favicon variant is picked from that setting.
  const favicon = (colors.defaultMode === "dark" && branding.faviconUrlDark) || branding.faviconUrl;

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {favicon ? (
        <span className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
          <Image src={favicon} alt="xzvl.store" fill sizes="32px" className="object-cover" />
        </span>
      ) : (
        <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-[14px] flex-shrink-0 shadow-sm shadow-primary/30">
          X
        </span>
      )}
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="text-[13px] font-semibold text-fg truncate">xzvl.store</p>
          <p className="text-[11px] text-accent/60 truncate">Back office</p>
        </div>
      )}
    </div>
  );
}

function NavList({
  pathname,
  collapsed = false,
  onNavigate,
  }: {
    pathname: string;
    collapsed?: boolean;
    onNavigate?: () => void;
  }) {
  return (
    <nav className="flex flex-col gap-5 px-3 py-4 flex-1 overflow-y-auto">
      {NAV.map((g) => (
        <div key={g.group} className="space-y-0.5">
          {collapsed ? (
            <div className="mx-2 mb-2 border-t border-line/30 first:hidden" />
          ) : (
            <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-accent/50">{g.group}</p>
          )}
          {g.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-md py-2 text-[13px] transition-colors ${
                  collapsed ? "justify-center px-2" : "px-2.5"
                } ${active ? "bg-primary/10 text-fg font-medium" : "text-accent/80 hover:text-fg hover:bg-fg/[0.04]"}`}
              >
                {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary" />}
                <span
                  className={`material-symbols-outlined text-[18px] ${active ? "text-primary" : "text-accent/60 group-hover:text-fg"}`}
                >
                  {item.icon}
                </span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ collapsed = false, onLogout }: { collapsed?: boolean; onLogout: () => void }) {
  const row = `flex items-center gap-3 rounded-md py-2 text-[13px] text-accent/80 hover:text-fg hover:bg-fg/[0.04] transition-colors w-full text-left ${
    collapsed ? "justify-center px-2" : "px-2.5"
  }`;
  return (
    <div className="px-3 py-3 border-t border-line/30 space-y-0.5">
      <Link href="/" target="_blank" title={collapsed ? "View store" : undefined} className={row}>
        <span className="material-symbols-outlined text-[18px] text-accent/60">open_in_new</span>
        {!collapsed && "View store"}
      </Link>
      <button onClick={onLogout} title={collapsed ? "Log out" : undefined} className={row}>
        <span className="material-symbols-outlined text-[18px] text-accent/60">logout</span>
        {!collapsed && "Log out"}
      </button>
      {!collapsed && (
        <div className="flex items-center gap-2.5 mt-2 px-2.5 py-2 rounded-md bg-fg/[0.03] border border-line/30">
          <span className="w-7 h-7 rounded-full bg-primary/15 text-primary text-[12px] font-semibold flex items-center justify-center flex-shrink-0">
            A
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[12px] font-medium text-fg truncate">Administrator</p>
            <p className="text-[11px] text-accent/60 truncate">Full access</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {}
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const current = ALL_ITEMS.filter((i) => isActive(pathname, i.href)).at(-1);
  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  });

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-deep flex flex-col lg:flex-row">
      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden" onClick={() => setMenuOpen(false)} />
          <aside className="fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-canvas border-r border-line/40 flex flex-col lg:hidden shadow-2xl">
            <div className="flex items-center justify-between h-14 px-4 border-b border-line/30">
              <Brand />
              <button
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-accent/70 hover:text-fg hover:bg-fg/[0.05] transition-colors"
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <NavList pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            <SidebarFooter onLogout={logout} />
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col ${collapsed ? "w-[68px]" : "w-60"} flex-shrink-0 lg:h-full bg-canvas border-r border-line/40 transition-[width] duration-200`}
      >
        <div className={`flex items-center h-14 border-b border-line/30 ${collapsed ? "justify-center px-2" : "px-4"}`}>
          <Brand compact={collapsed} />
        </div>
        <NavList pathname={pathname} collapsed={collapsed} />
        <SidebarFooter collapsed={collapsed} onLogout={logout} />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col lg:h-full">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 flex-shrink-0 flex items-center gap-3 px-4 md:px-6 bg-canvas/85 backdrop-blur border-b border-line/30">
          <button
            onClick={() => setMenuOpen(true)}
            className="lg:hidden w-8 h-8 -ml-1 flex items-center justify-center text-accent/70 hover:text-fg hover:bg-fg/[0.05] transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex w-8 h-8 -ml-2 items-center justify-center text-accent/70 hover:text-fg hover:bg-fg/[0.05] transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="material-symbols-outlined text-[20px]">{collapsed ? "left_panel_open" : "left_panel_close"}</span>
          </button>
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <nav className="flex items-center gap-1.5 text-[13px] min-w-0" aria-label="Breadcrumb">
            <Link href="/admin" className="text-accent/60 hover:text-fg transition-colors hidden sm:inline">
              Admin
            </Link>
            {current && current.href !== "/admin" && (
              <>
                <span className="material-symbols-outlined text-[16px] text-accent/40 hidden sm:inline">chevron_right</span>
                <Link href={current.href} className="text-fg font-medium truncate hover:text-primary transition-colors">
                  {current.label}
                </Link>
              </>
            )}
            {current?.href === "/admin" && (
              <>
                <span className="material-symbols-outlined text-[16px] text-accent/40 hidden sm:inline">chevron_right</span>
                <span className="text-fg font-medium">Dashboard</span>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 text-[12px] text-accent/60 px-2.5 h-8 rounded-md border border-line/30 tabular-nums">
              <span className="material-symbols-outlined text-[15px]">calendar_today</span>
              {today}
            </span>
            <Link
              href="/admin/orders/new"
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              New order
            </Link>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
