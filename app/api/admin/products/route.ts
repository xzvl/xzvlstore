import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { revalidateStorefront } from "@/lib/revalidate";

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
    pre_order_note,
    sneak_peek = false,
    sneak_peek_note,
    taxable = false,
    max_purchase_enabled = false,
    max_purchase_limit,
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

  if (sneak_peek && pre_order) {
    return NextResponse.json({ error: "A Sneak Peek product cannot also be a Pre-Order." }, { status: 400 });
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
      pre_order_note: pre_order_note || null,
      sneak_peek: Boolean(sneak_peek),
      sneak_peek_note: sneak_peek_note || null,
      taxable: Boolean(taxable),
      max_purchase_enabled: Boolean(max_purchase_enabled),
      max_purchase_limit: max_purchase_limit ? Number(max_purchase_limit) : null,
      status,
      sort_order,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateStorefront();
  return NextResponse.json(data, { status: 201 });
}
