import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    slug,
    description,
    sku,
    price,
    sale_price,
    cost,
    stock,
    brands,
    status = "active",
    pre_order = false,
    brand_id,
    category_ids,
    tag_ids,
    main_image,
    gallery_images,
    social_image,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const { data: maxData } = await supabase
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sort_order = (maxData?.sort_order ?? 0) + 1;
  const id = `prod-${Date.now()}`;

  const { data, error } = await supabase
    .from("products")
    .insert({
      id,
      name,
      slug: slug || null,
      description: description || null,
      sku: sku || null,
      price: Number(price ?? 0),
      sale_price: sale_price ? Number(sale_price) : null,
      cost: Number(cost ?? 0),
      stock: Number(stock ?? 0),
      brands: brands || null,
      image: main_image ?? "",
      main_image: main_image ?? null,
      gallery_images: gallery_images ?? [],
      social_image: social_image ?? null,
      brand_id: brand_id || null,
      category_ids: category_ids ?? [],
      tag_ids: tag_ids ?? [],
      pre_order: Boolean(pre_order),
      status,
      sort_order,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
