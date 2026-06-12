import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { StoreProduct } from "@/lib/store-types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import AddToCartButton from "./AddToCartButton";

const FIELDS =
  "id, slug, name, price, sale_price, image, main_image, gallery_images, social_image, pre_order, status, brand_id, brands, category_ids";

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
    description: (p.description as string | null) ?? null,
  };
}

async function getRecommended(brandId: string | null, excludeId: string): Promise<StoreProduct[]> {
  let query = supabase
    .from("products")
    .select(FIELDS)
    .eq("status", "active")
    .gt("stock", 0)
    .neq("id", excludeId)
    .order("sort_order", { ascending: true })
    .limit(6);

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { data } = await query;
  return (data ?? []).map(mapProduct);
}

const PRODUCT_SELECT =
  "id, slug, name, sku, description, price, sale_price, stock, image, main_image, gallery_images, social_image, pre_order, status, brand_id, brands, category_ids";

const nameToSlug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Primary lookup: stored slug column
  let { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  // Fallback: products where slug is not yet set — match by name-derived slug
  if (!data) {
    const { data: candidates } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .is("slug", null);

    data =
      (candidates ?? []).find(
        (p) => nameToSlug((p as Record<string, unknown>).name as string) === slug
      ) ?? null;
  }

  if (!data) notFound();

  const product = mapProduct(data as Record<string, unknown>);
  const allImages = [product.image, ...product.gallery_images];
  const recommended = await getRecommended(product.brand_id, product.id);

  const displayPrice = product.sale_price ?? product.price;

  return (
    <>
      <Header />
      <main className="bg-[#131313] min-h-screen">
        {/* Breadcrumb */}
        <div className="max-w-[1440px] mx-auto px-4 md:px-16 pt-6">
          <div className="flex items-center gap-2 font-mono text-[10px] text-[#e2e2e2]/30 tracking-widest uppercase">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            {product.brand_name && (
              <>
                <Link href={`/collection/${product.brand_name.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-primary transition-colors">
                  {product.brand_name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-[#e2e2e2]/60 truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>

        {/* Product detail */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">

            {/* Left: Images */}
            <ProductImages images={allImages} name={product.name} />

            {/* Right: Info */}
            <div className="flex flex-col gap-6">
              {/* Brand + badges */}
              <div className="flex items-center gap-3">
                {product.brand_name && (
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#ebbbb4]/50">
                    {product.brand_name}
                  </span>
                )}
                {product.pre_order && (
                  <span className="bg-primary px-2 py-0.5 font-mono text-[9px] text-white tracking-widest uppercase">
                    Pre-Order
                  </span>
                )}
              </div>

              {/* Name */}
              <h1 className="font-inter font-black text-[22px] md:text-[28px] text-[#e2e2e2] leading-tight uppercase">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="font-inter font-black text-[32px] text-primary">
                  ₱{displayPrice.toLocaleString()}
                </span>
                {product.sale_price && (
                  <span className="font-mono text-[16px] text-[#e2e2e2]/30 line-through">
                    ₱{product.price.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="h-px bg-[#603e39]/30" />

              {/* Stock info */}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  product.pre_order ? "bg-primary" : (product.stock ?? 0) > 0 ? "bg-green-500" : "bg-[#603e39]"
                }`} />
                <span className="font-mono text-[11px] text-[#e2e2e2]/50">
                  {product.pre_order
                    ? "Available for pre-order"
                    : (product.stock ?? 0) > 0
                    ? "In stock"
                    : "Out of stock"}
                </span>
              </div>

              {/* Add to cart */}
              <AddToCartButton product={product} />

              {/* Pre-order shortcut */}
              {product.pre_order && (
                <Link
                  href={`/pre-order?product=${product.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-[#603e39]/50 font-mono text-[11px] tracking-widest uppercase text-[#e2e2e2]/50 hover:border-primary hover:text-primary transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  Use Pre-Order Form
                </Link>
              )}

              <div className="h-px bg-[#603e39]/30" />

              {/* SKU */}
              {(data as { sku?: string }).sku && (
                <p className="font-mono text-[10px] text-[#ebbbb4]/30 tracking-widest">
                  SKU: {(data as { sku?: string }).sku}
                </p>
              )}

              {/* Description */}
              {product.description && (
                <div
                  className="prose prose-invert prose-sm max-w-none text-[#e2e2e2]/70 prose-headings:text-[#e2e2e2] prose-headings:font-inter prose-headings:uppercase prose-headings:tracking-wide prose-p:font-mono prose-p:text-[13px] prose-li:font-mono prose-li:text-[13px] prose-strong:text-[#e2e2e2]"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}

              {/* Shipping note */}
              <div className="border border-[#603e39]/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">local_shipping</span>
                  <span className="font-mono text-[11px] text-[#e2e2e2]/50">Shipping available nationwide (Philippines)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
                  <span className="font-mono text-[11px] text-[#e2e2e2]/50">100% authentic products</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recommended */}
        {recommended.length > 0 && (
          <section className="max-w-[1440px] mx-auto px-4 md:px-16 py-12 border-t border-[#603e39]/20">
            <div className="mb-6">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-1.5">// You May Also Like</p>
              <h2 className="font-inter font-black text-[24px] uppercase text-[#e2e2e2]">Recommended</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {recommended.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

// ─── Product images client component (extracted to avoid async boundary) ─────

function ProductImages({ images, name }: { images: string[]; name: string }) {
  // This is a server component — gallery interaction is handled via the client AddToCartButton
  // For full gallery interactivity, we inline-render the first image + thumbnails
  const [main, ...thumbs] = images;
  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square bg-[#1a1a1a] border border-[#603e39]/30 overflow-hidden">
        <Image
          src={main}
          alt={name}
          fill
          className="object-contain p-6"
          unoptimized
          priority
        />
      </div>
      {/* Thumbnails */}
      {thumbs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <div
              key={i}
              className={`shrink-0 w-16 h-16 border overflow-hidden ${i === 0 ? "border-primary" : "border-[#603e39]/40"} bg-[#1a1a1a]`}
            >
              <img src={img} alt={`${name} view ${i + 1}`} className="w-full h-full object-contain p-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
