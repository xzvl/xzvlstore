import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getBundleById, getStoreBundles } from "@/lib/bundles";
import { bundleCartPrices, bundleImage, percentOff, type ResolvedBundle } from "@/lib/bundle-types";
import { sizedImageUrl } from "@/lib/image-sizes";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BundleCard from "@/components/BundleCard";
import BlockedBanner from "@/components/BlockedBanner";
import ProductImages from "@/app/product/[slug]/ProductImages";
import ShareButtons from "@/app/product/[slug]/ShareButtons";
import BundleAddToCartButton from "./BundleAddToCartButton";

const FALLBACK_IMAGE = "/assets/favicon.webp";

// Inactive bundles are hidden from the storefront, so treat them as missing.
async function getVisibleBundle(id: string): Promise<ResolvedBundle | null> {
  const bundle = await getBundleById(id);
  return bundle && bundle.status === "active" ? bundle : null;
}

function bundleDescription(b: ResolvedBundle): string {
  const list = b.components.map((c) => `${c.qty}× ${c.name}`).join(", ");
  return `Bundle deal: ${list}. Shop authentic Beyblade X products at xzvl.store.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getVisibleBundle(id);
  if (!bundle) return {};

  const title = bundle.name;
  const description = bundleDescription(bundle);
  const image = bundleImage(bundle);
  const url = `/bundle/${bundle.id}`;
  const socialTitle = `${title} - xzvl.store`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "xzvl.store",
      url,
      title: socialTitle,
      description,
      ...(image && { images: [{ url: image, alt: title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default async function BundlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getVisibleBundle(id);
  if (!bundle) notFound();

  const mainImage = bundleImage(bundle) ?? FALLBACK_IMAGE;
  // Bundle image first, then each included product's main image followed by its gallery.
  const allImages = Array.from(
    new Set([
      mainImage,
      ...bundle.components.flatMap((c) => [c.image, ...c.gallery_images]).filter((i): i is string => !!i),
    ])
  );

  const { price, sale_price } = bundleCartPrices(bundle);
  const pay = sale_price ?? price;
  const savings = price - pay;
  const off = percentOff({ regular_total: price, discount: savings });
  const inStock = bundle.available && bundle.stock > 0;

  const otherBundles = (await getStoreBundles()).filter((b) => b.id !== bundle.id).slice(0, 4);

  return (
    <>
      <Header />
      <main className="bg-canvas min-h-screen">
        {/* Breadcrumb */}
        <div className="max-w-[1440px] mx-auto px-4 md:px-16 pt-6">
          <BlockedBanner className="mb-6" />
          <div className="flex items-center gap-2 font-mono text-[10px] text-fg/30 tracking-widest uppercase">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link href="/bundles" className="hover:text-primary transition-colors">Bundles</Link>
            <span>/</span>
            <span className="text-fg/60 truncate max-w-[200px]">{bundle.name}</span>
          </div>
        </div>

        {/* Bundle detail */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">

            {/* Left: Images */}
            <ProductImages images={allImages} name={bundle.name} />

            {/* Right: Info */}
            <div className="flex flex-col gap-6">
              {/* Badges */}
              <div className="flex items-center gap-3">
                <span className="bg-primary px-2 py-0.5 font-mono text-[9px] text-white tracking-widest uppercase">
                  Bundle
                </span>
                {off > 0 && (
                  <span className="bg-green-600 px-2 py-0.5 font-mono text-[9px] font-bold text-white tracking-widest">
                    −{off}%
                  </span>
                )}
              </div>

              {/* Name */}
              <h1 className="font-inter font-black text-[22px] md:text-[28px] text-fg leading-tight uppercase">
                {bundle.name}
              </h1>

              {/* Price */}
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-3">
                  <span className="font-inter font-black text-[32px] text-primary">
                    ₱{pay.toLocaleString()}
                  </span>
                  {savings > 0 && (
                    <span className="font-mono text-[16px] text-fg/30 line-through">
                      ₱{price.toLocaleString()}
                    </span>
                  )}
                </div>
                {savings > 0 && (
                  <p className="font-mono text-[11px] text-green-500 tracking-wide">
                    Save ₱{savings.toLocaleString()} vs. buying separately
                  </p>
                )}
              </div>

              <div className="h-px bg-line/30" />

              {/* Stock info */}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${inStock ? "bg-green-500" : "bg-line"}`} />
                <span className="font-mono text-[11px] text-fg/50">
                  {inStock ? "In stock" : "Out of stock"}
                </span>
              </div>

              {/* Add to cart */}
              <BundleAddToCartButton bundle={bundle} />

              <div className="h-px bg-line/30" />

              {/* Included products */}
              <div className="flex flex-col gap-3">
                <p className="font-mono text-[10px] tracking-widest uppercase text-accent/40">
                  What&apos;s Included
                </p>
                <ul className="flex flex-col border border-line/20 divide-y divide-line/20">
                  {bundle.components.map((c) => {
                    const thumb = c.image ? sizedImageUrl(c.image, "thumbnail") ?? c.image : null;
                    const content = (
                      <>
                        <div className="shrink-0 w-14 h-14 bg-white border border-line/20 overflow-hidden flex items-center justify-center">
                          {thumb ? (
                            <img src={thumb} alt={c.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="material-symbols-outlined text-[20px] text-line/40">image</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-inter font-bold text-[13px] text-fg leading-snug line-clamp-2">{c.name}</p>
                          <p className="font-mono text-[11px] text-accent/50">
                            ₱{c.unit_price.toLocaleString()} each
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-[13px] text-fg/70">×{c.qty}</span>
                      </>
                    );
                    return (
                      <li key={c.product_id}>
                        {c.slug ? (
                          <Link
                            href={`/product/${c.slug}`}
                            className="flex items-center gap-3 p-3 hover:bg-panel transition-colors"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 p-3">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Shipping note */}
              <div className="border border-line/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">local_shipping</span>
                  <span className="font-mono text-[11px] text-fg/50">Shipping available nationwide (Philippines)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
                  <span className="font-mono text-[11px] text-fg/50">100% authentic products</span>
                </div>
                <div className="pt-3 border-t border-line/20 flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-accent/40">Share</span>
                  <ShareButtons path={`/bundle/${bundle.id}`} title={bundle.name} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* More bundles */}
        {otherBundles.length > 0 && (
          <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-12 border-t border-line/20">
            <div className="mb-6">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-1.5">// Save More</p>
              <h2 className="font-inter font-black text-[24px] uppercase text-fg">More Bundles</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {otherBundles.map((b) => (
                <BundleCard key={b.id} bundle={b} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
