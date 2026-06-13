"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";

const navLinks = [
  { href: "/collection/all", label: "All Products" },
  { href: "/collection/new-releases", label: "New Releases" },
  { href: "/collection/takara-tomy", label: "Takara Tomy" },
  { href: "/collection/hasbro", label: "Hasbro" },
  { href: "/pre-order", label: "Pre-Order" },
];

export default function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#131313]/95 backdrop-blur-md border-b border-[#603e39]/40">
      <div className="max-w-[1440px] mx-auto px-4 md:px-16 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-inter font-black text-[20px] uppercase shrink-0 tracking-tight"
        >
          <span className="text-[#e2e2e2]">xzvl</span>
          <span className="text-primary">.</span>
          <span className="text-[#e2e2e2]">store</span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-[11px] tracking-[0.12em] uppercase text-[#e2e2e2]/55 hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-3 ml-auto md:ml-0">
          <Link
            href="/account"
            className="text-[#e2e2e2]/55 hover:text-primary transition-colors"
            aria-label="Account"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              person
            </span>
          </Link>
          <Link
            href="/cart"
            className="relative text-[#e2e2e2]/55 hover:text-primary transition-colors"
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
            className="md:hidden text-[#e2e2e2]/55 hover:text-primary transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {open ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#1a1a1a] border-b border-[#603e39]/40">
          <nav className="flex flex-col px-6 py-4 gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-mono text-[12px] tracking-[0.12em] uppercase text-[#e2e2e2]/60 hover:text-primary transition-colors py-1 border-b border-[#603e39]/20 last:border-0"
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
