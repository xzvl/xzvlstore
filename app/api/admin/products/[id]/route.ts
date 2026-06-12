import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.name !== undefined) updates.name = body.name;
  if (body.slug !== undefined) updates.slug = body.slug || null;
  if (body.description !== undefined) updates.description = body.description || null;
  if (body.sku !== undefined) updates.sku = body.sku || null;
  if (body.price !== undefined) updates.price = Number(body.price);
  if (body.sale_price !== undefined) updates.sale_price = body.sale_price ? Number(body.sale_price) : null;
  if (body.cost !== undefined) updates.cost = Number(body.cost);
  if (body.stock !== undefined) updates.stock = Number(body.stock);
  if (body.brands !== undefined) updates.brands = body.brands || null;
  if (body.status !== undefined) updates.status = body.status;
  if (body.pre_order !== undefined) updates.pre_order = Boolean(body.pre_order);
  if (body.brand_id !== undefined) updates.brand_id = body.brand_id || null;
  if (body.category_ids !== undefined) updates.category_ids = body.category_ids;
  if (body.tag_ids !== undefined) updates.tag_ids = body.tag_ids;
  if (body.main_image !== undefined) {
    updates.main_image = body.main_image || null;
    updates.image = body.main_image ?? "";
  }
  if (body.gallery_images !== undefined) updates.gallery_images = body.gallery_images;
  if (body.social_image !== undefined) updates.social_image = body.social_image || null;
  if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order);

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
