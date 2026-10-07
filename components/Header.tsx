"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useSiteContent } from "@/components/SiteContentProvider";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  const { count } = useCart();
  const { branding, header } = useSiteContent();
  const navLinks = header.navLinks;
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-header/95 backdrop-blur-md border-b border-line/40">
      <div className="max-w-[1440px] mx-auto px-4 md:px-16 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-inter font-black text-[20px] uppercase shrink-0 tracking-tight"
        >
          {branding.logoImageUrl ? (
            <span className="relative block h-8 w-36">
              <Image src={branding.logoImageUrl} alt="xzvl.store" fill sizes="144px" className="object-contain object-left" priority />
            </span>
          ) : (
            <>
              <span className="text-header-fg">xzvl</span>
              <span className="text-primary">.</span>
              <span className="text-header-fg">store</span>
            </>
          )}
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
          {navLinks.map((link, i) => (
            <Link
              key={`${link.href}-${i}`}
              href={link.href}
              className="font-mono text-[11px] tracking-[0.12em] uppercase text-header-fg/55 hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-3 ml-auto md:ml-0">
          <ThemeToggle className="text-header-fg/55 hover:text-primary transition-colors" />
          <Link
            href="/account"
            className="text-header-fg/55 hover:text-primary transition-colors"
            aria-label="Account"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              person
            </span>
          </Link>
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="text-header-fg/55 hover:text-primary transition-colors"
            aria-label="Search"
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {searchOpen ? "close" : "search"}
            </span>
          </button>
          <Link
            href="/cart"
            className="relative text-header-fg/55 hover:text-primary transition-colors"
            aria-label="Cart"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              shopping_cart
            </span>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-primary rounded-full text-[9px] text-white flex items-center justify-center font-mono font-bold px-0.5">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
          <button
            className="md:hidden text-header-fg/55 hover:text-primary transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {open ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="border-b border-line/40 bg-header">
          <div className="max-w-[1440px] mx-auto px-4 md:px-16 py-3">
            <SearchBar autoFocus onSubmit={() => setSearchOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-header border-b border-line/40">
          <nav className="flex flex-col px-6 py-4 gap-4">
            {navLinks.map((link, i) => (
              <Link
                key={`${link.href}-${i}`}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-mono text-[12px] tracking-[0.12em] uppercase text-header-fg/60 hover:text-primary transition-colors py-1 border-b border-line/20 last:border-0"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
