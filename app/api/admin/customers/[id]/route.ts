import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const allowed = [
    "first_name", "last_name",
    "facebook_url", "instagram_url", "tiktok_url", "twitter_url",
    "billing_address_1", "billing_address_2", "billing_city", "billing_state",
    "billing_postcode", "billing_region", "billing_phone",
    "shipping_address_1", "shipping_address_2", "shipping_city", "shipping_state",
    "shipping_postcode", "shipping_region", "shipping_phone",
  ];

  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  // Update email on auth user if provided
  if (body.email) {
    const { error: authError } = await supabase.auth.admin.updateUserById(id, { email: body.email });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    updates.email = body.email;
  }

  const { data, error } = await supabase
    .from("customers")
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

  // Deleting the auth user cascades to the customers row
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
