import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, first_name, last_name, email, auth_provider, billing_phone, billing_city, billing_state, billing_address_1, billing_address_2, billing_postcode, billing_region, shipping_address_1, shipping_address_2, shipping_city, shipping_state, shipping_postcode, shipping_region, shipping_phone, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    first_name = "", last_name = "", email, password,
    facebook_url = "", instagram_url = "", tiktok_url = "", twitter_url = "",
    billing_address_1 = "", billing_address_2 = "",
    billing_city = "", billing_state = "", billing_postcode = "",
    billing_region = "Philippines", billing_phone = "",
    shipping_address_1 = "", shipping_address_2 = "",
    shipping_city = "", shipping_state = "", shipping_postcode = "",
    shipping_region = "Philippines", shipping_phone = "",
  } = body;

  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (!password) return NextResponse.json({ error: "Password is required." }, { status: 400 });

  // Create the auth user — the trigger will auto-insert the customers row
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { given_name: first_name, family_name: last_name },
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  // Update the customer row with address info (trigger only sets name/email)
  const { data, error } = await supabase
    .from("customers")
    .update({
      first_name, last_name,
      facebook_url, instagram_url, tiktok_url, twitter_url,
      billing_address_1, billing_address_2, billing_city, billing_state,
      billing_postcode, billing_region, billing_phone,
      shipping_address_1, shipping_address_2, shipping_city, shipping_state,
      shipping_postcode, shipping_region, shipping_phone,
    })
    .eq("id", authData.user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
