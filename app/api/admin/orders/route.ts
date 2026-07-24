import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { adjustStock, DEDUCTING_STATUSES } from "@/lib/stock";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name, email, phone, location,
    status = "pending", items = [],
    discount = 0, delivery_method = null, payment_method = null, tracking_number = null,
    shipping_fee = null,
    official_receipt = null, down_payment = 0,
    estimated_total, customer_id = null, notes = null, created_at = null,
    billing_address_1 = "", billing_address_2 = "",
    billing_city = "", billing_state = "", billing_postcode = "",
    billing_region = "Philippines", billing_phone = "",
    shipping_address_1 = "", shipping_address_2 = "",
    shipping_city = "", shipping_state = "", shipping_postcode = "",
    shipping_region = "Philippines", shipping_phone = "",
  } = body;

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const total = estimated_total ??
    (items as { subtotal: number }[]).reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0) - (Number(discount) || 0);

  const { data, error } = await supabase
    .from("orders")
    .insert({
      name, email: email || "", phone: phone || "", location: location || "",
      status, estimated_total: Math.max(0, total), items,
      discount: Number(discount) || 0, delivery_method, payment_method, tracking_number,
      shipping_fee: delivery_method === "Pickup" ? null : (shipping_fee === null || shipping_fee === "" ? null : Number(shipping_fee)),
      official_receipt, down_payment: Number(down_payment) || 0,
      customer_id: customer_id || null, notes: notes || null,
      ...(created_at ? { created_at } : {}),
      billing_address_1, billing_address_2, billing_city, billing_state,
      billing_postcode, billing_region, billing_phone,
      shipping_address_1, shipping_address_2, shipping_city, shipping_state,
      shipping_postcode, shipping_region, shipping_phone,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (DEDUCTING_STATUSES.has(status)) {
    await adjustStock(items as { product_id?: string | null; qty: number }[], -1);
  }

  return NextResponse.json(data, { status: 201 });
}
