import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, sku, price, sale_price, stock, image, main_image, gallery_images, social_image, pre_order, status, brand_id, brands, category_ids, tag_ids"
    )
    .eq("id", id)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Product not found" }, { status: 404 });

  return NextResponse.json({
    id: data.id,
    name: data.name,
    sku: data.sku ?? null,
    price: data.price,
    sale_price: data.sale_price ?? null,
    stock: data.stock ?? 0,
    pre_order: data.pre_order ?? false,
    image: data.main_image ?? data.image,
    gallery_images: ((data.gallery_images ?? []) as string[]).filter(Boolean),
    social_image: data.social_image ?? null,
    status: data.status,
    brand_id: data.brand_id ?? null,
    brand_name: data.brands ?? null,
    category_ids: data.category_ids ?? [],
  });
}
