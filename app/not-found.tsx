import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="bg-[#131313] min-h-screen">
        {/* Hero */}
        <section className="relative bg-[#0e0e0e] cyber-grid overflow-hidden border-b border-[#603e39]/20">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
          <div className="max-w-[1440px] mx-auto px-6 md:px-20 py-16">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary mb-3">
              // Error 404
            </p>
            <h1
              className="font-inter font-black uppercase leading-none tracking-tight text-[#e2e2e2]"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
            >
              Page Not Found
            </h1>
            <p className="font-mono text-[12px] text-[#ebbbb4]/40 mt-4">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-24">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-[64px] text-[#603e39]/30 mb-6">
              search_off
            </span>
            <p className="font-inter font-bold text-[18px] text-[#e2e2e2]/40 uppercase mb-2">
              404 — Lost in the arena
            </p>
            <p className="font-mono text-[12px] text-[#ebbbb4]/25 mb-8 max-w-md">
              The blade you&apos;re searching for isn&apos;t here. Head back home or browse our collection.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-mono text-[10px] tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">home</span>
                Back to Home
              </Link>
              <Link
                href="/collection/all"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#603e39]/40 font-mono text-[10px] tracking-widest uppercase text-[#e2e2e2]/40 hover:text-primary hover:border-primary transition-all"
              >
                View All Products
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
