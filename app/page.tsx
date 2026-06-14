import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import type { StoreProduct } from "@/lib/store-types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSlider from "@/components/HeroSlider";
import ProductCard from "@/components/ProductCard";
import PreOrderCarousel from "@/components/PreOrderCarousel";
import MobileProductCarousel from "@/components/MobileProductCarousel";

// ─── Data helpers ─────────────────────────────────────────────────────────────

const FIELDS =
  "id, slug, name, price, sale_price, stock, image, main_image, gallery_images, social_image, pre_order, status, brand_id, brands, category_ids";

function mapProduct(p: Record<string, unknown>): StoreProduct {
  return {
    id: p.id as string,
    slug: (p.slug as string | null) || (p.name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: p.name as string,
    price: p.price as number,
    sale_price: (p.sale_price as number | null) ?? null,
    pre_order: (p.pre_order as boolean) ?? false,
    stock: (p.stock as number) ?? 0,
    image: (p.main_image as string | null) ?? (p.image as string),
    gallery_images: ((p.gallery_images as string[] | null) ?? []).filter(Boolean),
    social_image: (p.social_image as string | null) ?? null,
    status: p.status as "active" | "inactive",
    brand_id: (p.brand_id as string | null) ?? null,
    brand_name: (p.brands as string | null) ?? null,
    category_ids: (p.category_ids as string[] | null) ?? [],
  };
}

async function getProductsByBrand(slug: string, limit: number): Promise<StoreProduct[]> {
  const { data: brand } = await supabase
    .from("taxonomy")
    .select("id")
    .eq("slug", slug)
    .eq("type", "brand")
    .single();
  if (!brand) return [];

  const { data } = await supabase
    .from("products")
    .select(FIELDS)
    .eq("brand_id", brand.id)
    .eq("status", "active")
    .gt("stock", 0)
    .order("sort_order", { ascending: true })
    .limit(limit);
  return (data ?? []).map(mapProduct);
}

async function getNewReleases(limit: number): Promise<StoreProduct[]> {
  const { data: category } = await supabase
    .from("taxonomy")
    .select("id")
    .eq("slug", "new-releases")
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("products")
    .select(FIELDS)
    .eq("status", "active")
    .gt("stock", 0)
    .limit(limit);

  if (category) {
    query = query.contains("category_ids", [category.id]);
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data } = await query;
  return (data ?? []).map(mapProduct);
}

async function getPreOrders(): Promise<StoreProduct[]> {
  const { data } = await supabase
    .from("products")
    .select(FIELDS)
    .eq("pre_order", true)
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  return (data ?? []).map(mapProduct);
}

// ─── Section components ───────────────────────────────────────────────────────

function SectionHeader({
  tag,
  title,
  href,
  linkLabel = "View All",
}: {
  tag: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-1.5">{tag}</p>
        <h2 className="font-inter font-black text-[28px] md:text-[36px] uppercase leading-none tracking-tight text-[#e2e2e2]">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="hidden md:flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] uppercase text-[#e2e2e2]/50 hover:text-primary transition-colors shrink-0"
        >
          {linkLabel}
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      )}
    </div>
  );
}

function ProductGrid({ products }: { products: StoreProduct[] }) {
  if (products.length === 0) return null;
  return (
    <>
      <MobileProductCarousel products={products} />
      {/* Desktop: grid */}
      <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [newReleases, preOrders, ttProducts, hasbroProducts] = await Promise.all([
    getNewReleases(5),
    getPreOrders(),
    getProductsByBrand("takara-tomy", 5),
    getProductsByBrand("hasbro", 5),
  ]);

  return (
    <>
      <Header />
      <main className="bg-[#131313]">

        {/* ── Hero ── */}
        <HeroSlider />

        {/* ── New Releases ── */}
        {newReleases.length > 0 && (
          <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-16">
            <SectionHeader
              tag="// Latest Drops"
              title="New Beyblade Releases"
              href="/collection/new-releases"
            />
            <ProductGrid products={newReleases} />
            <div className="mt-6 md:hidden text-center">
              <Link
                href="/collection/new-releases"
                className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[#e2e2e2]/50 hover:text-primary transition-colors"
              >
                View All
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </section>
        )}

        {/* ── Shop by Series ── */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-16 border-t border-[#603e39]/20">
          <SectionHeader tag="// Browse Series" title="Shop by Series" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { slug: "bx", label: "BX Series", sub: "Basic Line", color: "from-[#0369a1]/20", image: "/assets/bx.webp" },
              { slug: "ux", label: "UX Series", sub: "Unique Line", color: "from-[#ca8a04]/20", image: "/assets/ux.webp" },
              { slug: "cx", label: "CX Series", sub: "Custom Line", color: "from-[#ed0d11]/20", image: "/assets/cx.webp" },
              { slug: "collabs", label: "Collabs", sub: "Special Editions", color: "from-[#7c3aed]/20", image: "/assets/collabs.webp" },
            ].map((s) => (
              <Link
                key={s.slug}
                href={`/collection/${s.slug}`}
                className={`group relative overflow-hidden border border-[#603e39]/30 hover:border-primary/50 transition-all bg-gradient-to-b ${s.color} to-transparent`}
                style={{ aspectRatio: "3/4" }}
              >
                <div className="absolute inset-0 cyber-grid opacity-30" />

                {/* Series image — fixed 70% height, width expands 50%→70% on hover */}
                <div className="absolute top-0 left-0 w-[70%] h-full group-hover:w-[80%] transition-all duration-500 overflow-hidden">
                  <Image src={s.image} alt={s.label} fill sizes="(max-width: 768px) 35vw, 18vw" className="object-cover object-right opacity-30 group-hover:opacity-50 transition-opacity duration-500 mix-blend-luminosity" unoptimized />
                </div>

                <div className="relative p-5 flex flex-col justify-end h-full">
                  <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#ebbbb4]/40 mb-1">
                    {s.sub}
                  </p>
                  <h3 className="font-inter font-black text-[28px] md:text-[36px] uppercase leading-none text-[#e2e2e2] group-hover:text-primary transition-colors">
                    {s.label}
                  </h3>
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="font-mono text-[10px] tracking-widest uppercase text-primary">
                      Explore
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-primary">
                      arrow_forward
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Pre-Order ── */}
        {preOrders.length > 0 && (
          <section className="py-16 border-t border-[#603e39]/20 bg-[#0e0e0e]">
            <div className="max-w-[1440px] mx-auto px-4 md:px-16">
              <SectionHeader
                tag="// Available Now"
                title="Pre-Order"
                href="/pre-order"
                linkLabel="View Form"
              />
              <PreOrderCarousel products={preOrders} />
              <div className="mt-6 md:hidden text-center">
                <Link
                  href="/pre-order"
                  className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[#e2e2e2]/50 hover:text-primary transition-colors"
                >
                  Pre-Order Form
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Shop by Brand ── */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-16 border-t border-[#603e39]/20">
          <SectionHeader tag="// Official Brands" title="Shop by Brand" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                slug: "takara-tomy",
                name: "Takara Tomy",
                sub: "Official Japanese Manufacturer",
                desc: "The original creator of Beyblade. Authentic Japanese products for competitive and casual play.",
                tag: "TT",
              },
              {
                slug: "hasbro",
                name: "Hasbro",
                sub: "Official Western Manufacturer",
                desc: "Hasbro's official Beyblade lineup featuring unique designs and exclusive regional releases.",
                tag: "HB",
              },
            ].map((brand) => (
              <Link
                key={brand.slug}
                href={`/collection/${brand.slug}`}
                className="group relative overflow-hidden border border-[#603e39]/30 hover:border-primary/50 transition-all bg-[#1a1a1a] cyber-grid"
                style={{ minHeight: 200 }}
              >
                <div className="relative p-8 flex flex-col justify-between h-full" style={{ minHeight: 200 }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#ebbbb4]/40 mb-2">
                        {brand.sub}
                      </p>
                      <h3 className="font-inter font-black text-[32px] md:text-[42px] uppercase leading-none text-[#e2e2e2] group-hover:text-primary transition-colors">
                        {brand.name}
                      </h3>
                    </div>
                    <span className="font-inter font-black text-[60px] leading-none text-[#e2e2e2]/5 select-none">
                      {brand.tag}
                    </span>
                  </div>
                  <div className="flex items-end justify-between mt-4">
                    <p className="font-mono text-[11px] text-[#ebbbb4]/40 max-w-xs">{brand.desc}</p>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                      <span className="font-mono text-[10px] tracking-widest uppercase text-primary">Shop</span>
                      <span className="material-symbols-outlined text-[14px] text-primary">arrow_forward</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Takara Tomy ── */}
        {ttProducts.length > 0 && (
          <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-16 border-t border-[#603e39]/20">
            <SectionHeader
              tag="// Official TT"
              title="Takara Tomy"
              href="/collection/takara-tomy"
            />
            <ProductGrid products={ttProducts} />
            <div className="mt-6 md:hidden text-center">
              <Link
                href="/collection/takara-tomy"
                className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[#e2e2e2]/50 hover:text-primary transition-colors"
              >
                View All
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </section>
        )}

        {/* ── Hasbro ── */}
        {hasbroProducts.length > 0 && (
          <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-16 border-t border-[#603e39]/20">
            <SectionHeader
              tag="// Official HB"
              title="Hasbro"
              href="/collection/hasbro"
            />
            <ProductGrid products={hasbroProducts} />
            <div className="mt-6 md:hidden text-center">
              <Link
                href="/collection/hasbro"
                className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[#e2e2e2]/50 hover:text-primary transition-colors"
              >
                View All
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </section>
        )}

        {/* ── CTA ── */}
        <section className="py-20 border-t border-[#603e39]/20 bg-[#0e0e0e] cyber-grid">
          <div className="max-w-[1440px] mx-auto px-4 md:px-16 text-center">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary mb-4">
              // Don&apos;t Miss Out
            </p>
            <h2
              className="font-inter font-black uppercase leading-tight text-[#e2e2e2] mb-6"
              style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
            >
              Secure Your Blade
              <br />
              <span className="text-primary">Before It&apos;s Gone</span>
            </h2>
            <p className="font-mono text-[13px] text-[#ebbbb4]/50 max-w-md mx-auto mb-8 leading-relaxed">
              Pre-order the latest Beyblade releases and get them delivered
              anywhere in the Philippines. Limited stocks only.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/pre-order"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white font-mono text-[11px] tracking-[0.2em] uppercase hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                Pre-Order Now
              </Link>
              <Link
                href="/collection/all"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-[#603e39]/60 text-[#e2e2e2]/60 font-mono text-[11px] tracking-[0.2em] uppercase hover:border-primary hover:text-primary transition-all"
              >
                Browse Catalog
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
