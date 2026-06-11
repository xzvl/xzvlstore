import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function getUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("customers").select("*").eq("id", user.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = [
    "first_name", "last_name",
    "billing_address_1", "billing_address_2", "billing_city",
    "billing_postcode", "billing_region", "billing_state", "billing_phone",
    "shipping_address_1", "shipping_address_2", "shipping_city",
    "shipping_postcode", "shipping_region", "shipping_state", "shipping_phone",
  ];

  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from("customers")
    .upsert({ id: user.id, email: user.email!, ...updates })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
