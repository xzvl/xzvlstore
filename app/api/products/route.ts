import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, sale_price, image, main_image, pre_order, status")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mapped = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    sale_price: p.sale_price ?? null,
    pre_order: p.pre_order ?? false,
    image: p.main_image ?? p.image,
    status: p.status,
  }));

  return NextResponse.json(mapped);
}
