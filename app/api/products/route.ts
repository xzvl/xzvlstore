import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PRODUCT_FIELDS =
  "id, slug, name, price, sale_price, stock, image, main_image, gallery_images, social_image, pre_order, pre_order_note, status, brand_id, brands, category_ids";

function mapProduct(p: Record<string, unknown>) {
  return {
    id: p.id,
    slug: (p.slug as string | null) || (p.name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: p.name,
    price: p.price,
    sale_price: (p.sale_price as number | null) ?? null,
    stock: (p.stock as number | null) ?? undefined,
    pre_order: (p.pre_order as boolean) ?? false,
    pre_order_note: (p.pre_order_note as string | null) ?? null,
    image: (p.main_image as string | null) ?? (p.image as string),
    gallery_images: ((p.gallery_images as string[] | null) ?? []).filter(Boolean),
    social_image: (p.social_image as string | null) ?? null,
    status: p.status,
    brand_id: (p.brand_id as string | null) ?? null,
    brand_name: (p.brands as string | null) ?? null,
    category_ids: (p.category_ids as string[] | null) ?? [],
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get("brand");
  const category = searchParams.get("category");
  const preOrder = searchParams.get("preOrder");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam) : 100;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (preOrder === "true") {
    // Pre-order listings: show regardless of current stock
    query = query.eq("pre_order", true);
  } else {
    // Regular listings: only show products with stock
    query = query.gt("stock", 0);
  }

  if (brand) {
    const { data: brandData } = await supabase
      .from("taxonomy")
      .select("id")
      .eq("slug", brand)
      .eq("type", "brand")
      .single();
    if (!brandData) return NextResponse.json([]);
    query = query.eq("brand_id", brandData.id);
  }

  if (category) {
    const { data: categoryData } = await supabase
      .from("taxonomy")
      .select("id")
      .eq("slug", category)
      .eq("type", "category")
      .single();
    if (!categoryData) return NextResponse.json([]);
    query = query.contains("category_ids", [categoryData.id]);
  }

  query = query.limit(limit);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((data ?? []).map(mapProduct));
}
