import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BundleCard from "@/components/BundleCard";
import { getStoreBundles } from "@/lib/bundles";

export const metadata: Metadata = { title: "Bundle Deals" };

export default async function BundlesPage() {
  const bundles = await getStoreBundles();

  return (
    <>
      <Header />
      <main className="bg-canvas min-h-screen">
        <div className="max-w-[1440px] mx-auto px-4 md:px-16 py-12">
          <div className="mb-10">
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-1.5">// Save More</p>
            <h1 className="font-inter font-black text-[32px] md:text-[40px] uppercase leading-none text-fg">
              Bundle Deals
            </h1>
          </div>

          {bundles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[64px] text-line/40 mb-6">package_2</span>
              <p className="font-inter font-bold text-[20px] text-fg/60 mb-8 uppercase">No bundles right now</p>
              <Link
                href="/collection/new-releases"
                className="inline-flex items-center gap-3 px-8 py-3 bg-primary text-white font-mono text-[11px] tracking-[0.2em] uppercase hover:brightness-110 transition-all"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {bundles.map((b) => (
                <BundleCard key={b.id} bundle={b} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
