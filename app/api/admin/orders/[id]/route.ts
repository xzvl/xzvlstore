import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { adjustStock, DEDUCTING_STATUSES } from "@/lib/stock";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Fetch current order so we can calculate stock deltas
  const { data: existing, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !existing) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const updates: Record<string, unknown> = {};
  const fields = [
    "name", "email", "phone", "location", "status", "estimated_total",
    "discount", "delivery_method", "payment_method", "tracking_number", "items", "customer_id", "created_at",
    "billing_address_1", "billing_address_2", "billing_city", "billing_state",
    "billing_postcode", "billing_region", "billing_phone",
    "shipping_address_1", "shipping_address_2", "shipping_city", "shipping_state",
    "shipping_postcode", "shipping_region", "shipping_phone",
    "notes",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Stock adjustment

  const oldStatus: string = existing.status;
  const newStatus: string = body.status ?? oldStatus;
  const oldItems = existing.items as { product_id?: string | null; qty: number }[];
  const newItems = (body.items ?? oldItems) as { product_id?: string | null; qty: number }[];
  const statusChanging = body.status !== undefined && body.status !== oldStatus;
  const itemsChanging = body.items !== undefined;

  if (statusChanging || (itemsChanging && DEDUCTING_STATUSES.has(newStatus))) {
    if (DEDUCTING_STATUSES.has(oldStatus)) await adjustStock(oldItems, +1); // restore old
    if (DEDUCTING_STATUSES.has(newStatus)) await adjustStock(newItems, -1); // deduct new
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
