import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { StoreProduct } from "@/lib/store-types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";

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

async function getTaxonomyAndProducts(slug: string): Promise<{
  name: string;
  type: string;
  products: StoreProduct[];
} | null> {
  if (slug === "all") {
    const { data } = await supabase
      .from("products")
      .select(FIELDS)
      .eq("status", "active")
      .or("stock.gt.0,pre_order.eq.true")
      .order("sort_order", { ascending: true });
    return { name: "All Products", type: "all", products: (data ?? []).map(mapProduct) };
  }

  if (slug === "new-releases") {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data } = await supabase
      .from("products")
      .select(FIELDS)
      .eq("status", "active")
      .or("stock.gt.0,pre_order.eq.true")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });
    return { name: "New Releases", type: "new-releases", products: (data ?? []).map(mapProduct) };
  }

  const { data: taxonomy } = await supabase
    .from("taxonomy")
    .select("id, type, name, description, slug")
    .eq("slug", slug)
    .single();

  if (!taxonomy) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("products")
    .select(FIELDS)
    .eq("status", "active")
    .gt("stock", 0)
    .order("sort_order", { ascending: true });

  if (taxonomy.type === "brand") {
    query = query.eq("brand_id", taxonomy.id);
  } else if (taxonomy.type === "category") {
    query = query.contains("category_ids", [taxonomy.id]);
  } else if (taxonomy.type === "tag") {
    query = query.contains("tag_ids", [taxonomy.id]);
  }

  const { data } = await query;
  return {
    name: taxonomy.name,
    type: taxonomy.type,
    products: (data ?? []).map(mapProduct),
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ taxonomy: string }>;
}) {
  const { taxonomy: slug } = await params;
  const result = await getTaxonomyAndProducts(slug);

  if (!result) notFound();

  const { name, products } = result;

  return (
    <>
      <Header />
      <main className="bg-[#131313] min-h-screen">
        {/* Hero */}
        <section className="relative bg-[#0e0e0e] cyber-grid overflow-hidden border-b border-[#603e39]/20">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
          <div className="max-w-[1440px] mx-auto px-6 md:px-20 py-16">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary mb-3">
              // Collection
            </p>
            <h1
              className="font-inter font-black uppercase leading-none tracking-tight text-[#e2e2e2]"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
            >
              {name}
            </h1>
            <p className="font-mono text-[12px] text-[#ebbbb4]/40 mt-4">
              {products.length} {products.length === 1 ? "product" : "products"} found
            </p>
          </div>
        </section>

        {/* Products */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-12">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[64px] text-[#603e39]/30 mb-6">
                inventory_2
              </span>
              <p className="font-inter font-bold text-[18px] text-[#e2e2e2]/40 uppercase mb-2">
                No products yet
              </p>
              <p className="font-mono text-[12px] text-[#ebbbb4]/25 mb-8">
                Check back soon or browse other collections.
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
        </section>
      </main>
      <Footer />
    </>
  );
}
