import { cache } from "react";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import type { Taxonomy } from "@/lib/supabase";
import type { StoreProduct } from "@/lib/store-types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import SearchFilters from "@/components/SearchFilters";
import SearchBar from "@/components/SearchBar";

const FIELDS =
  "id, slug, name, price, sale_price, stock, image, main_image, gallery_images, social_image, pre_order, status, brand_id, brands, category_ids, max_purchase_enabled, max_purchase_limit";

function mapProduct(p: Record<string, unknown>): StoreProduct {
  return {
    id: p.id as string,
    slug: (p.slug as string | null) || (p.name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: p.name as string,
    price: p.price as number,
    sale_price: (p.sale_price as number | null) ?? null,
    pre_order: (p.pre_order as boolean) ?? false,
    stock: (p.stock as number) ?? 0,
    max_purchase_enabled: (p.max_purchase_enabled as boolean) ?? false,
    max_purchase_limit: (p.max_purchase_limit as number | null) ?? null,
    image: (p.main_image as string | null) ?? (p.image as string),
    gallery_images: ((p.gallery_images as string[] | null) ?? []).filter(Boolean),
    social_image: (p.social_image as string | null) ?? null,
    status: p.status as "active" | "inactive",
    brand_id: (p.brand_id as string | null) ?? null,
    brand_name: (p.brands as string | null) ?? null,
    category_ids: (p.category_ids as string[] | null) ?? [],
  };
}

const getFilteredProducts = cache(async function getFilteredProducts(params: {
  q: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
}): Promise<StoreProduct[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("products")
    .select(FIELDS)
    .eq("status", "active")
    .or("stock.gt.0,pre_order.eq.true");

  if (params.q) {
    const term = params.q.replace(/[,()]/g, " ").trim();
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const categoryIds = params.category?.split(",").filter(Boolean) ?? [];
  if (categoryIds.length > 0) {
    query = query.overlaps("category_ids", categoryIds);
  }

  const brandIds = params.brand?.split(",").filter(Boolean) ?? [];
  if (brandIds.length > 0) {
    query = query.in("brand_id", brandIds);
  }

  const min = params.minPrice ? Number(params.minPrice) : undefined;
  const max = params.maxPrice ? Number(params.maxPrice) : undefined;
  if (min !== undefined && !Number.isNaN(min)) query = query.gte("price", min);
  if (max !== undefined && !Number.isNaN(max)) query = query.lte("price", max);

  query = query.order("sort_order", { ascending: true });

  const { data } = await query;
  return (data ?? []).map(mapProduct);
});

function parseSearchParams(sp: Record<string, string | string[] | undefined>) {
  return {
    q: typeof sp.q === "string" ? sp.q : "",
    category: typeof sp.category === "string" ? sp.category : undefined,
    brand: typeof sp.brand === "string" ? sp.brand : undefined,
    minPrice: typeof sp.minPrice === "string" ? sp.minPrice : undefined,
    maxPrice: typeof sp.maxPrice === "string" ? sp.maxPrice : undefined,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = parseSearchParams(await searchParams);
  if (!params.q) return { title: "Search" };

  const products = await getFilteredProducts(params);
  const count = products.length;
  return {
    title: `Search: ${count} ${count === 1 ? "result" : "results"} found for "${params.q}"`,
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, category, brand, minPrice, maxPrice } = parseSearchParams(await searchParams);

  const [{ data: taxonomyRows }, products] = await Promise.all([
    supabase
      .from("taxonomy")
      .select("id, type, name, description, slug, created_at")
      .order("name", { ascending: true }),
    getFilteredProducts({ q, category, brand, minPrice, maxPrice }),
  ]);

  const categories = ((taxonomyRows ?? []) as Taxonomy[]).filter((t) => t.type === "category");
  const brands = ((taxonomyRows ?? []) as Taxonomy[]).filter((t) => t.type === "brand");

  const currentParams = { q, category, brand, minPrice, maxPrice };

  return (
    <>
      <Header />
      <main className="bg-[#131313] min-h-screen">
        {/* Hero */}
        <section className="relative bg-[#0e0e0e] cyber-grid overflow-hidden border-b border-[#603e39]/20">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
          <div className="max-w-[1440px] mx-auto px-6 md:px-20 py-16">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary mb-3">
              // Search
            </p>
            <h1
              className="font-inter font-black uppercase leading-none tracking-tight text-[#e2e2e2]"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
            >
              {q ? `"${q}"` : "Search"}
            </h1>
            <p className="font-mono text-[12px] text-[#ebbbb4]/40 mt-4">
              {products.length} {products.length === 1 ? "product" : "products"} found
            </p>
            <SearchBar defaultValue={q} className="max-w-md mt-6" />
          </div>
        </section>

        {/* Filters + Products */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-12 flex flex-col lg:flex-row gap-8">
          <SearchFilters categories={categories} brands={brands} currentParams={currentParams} />

          <div className="flex-1 min-w-0">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="material-symbols-outlined text-[64px] text-[#603e39]/30 mb-6">
                  search_off
                </span>
                <p className="font-inter font-bold text-[18px] text-[#e2e2e2]/40 uppercase mb-2">
                  No products found
                </p>
                <p className="font-mono text-[12px] text-[#ebbbb4]/25 mb-8">
                  Try a different search term or adjust your filters.
                </p>
                <a
                  href="/collection/all"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-[#603e39]/40 font-mono text-[10px] tracking-widest uppercase text-[#e2e2e2]/40 hover:text-primary hover:border-primary transition-all"
                >
                  View All Products
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
