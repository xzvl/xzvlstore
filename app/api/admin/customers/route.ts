import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// This GET reads no request-bound data (no params/cookies/headers), so Next.js
// would otherwise treat it as static and let Vercel cache the response at the
// edge — serving a stale customer list forever. Force it dynamic.
export const dynamic = "force-dynamic";

// PostgREST caps a select at 1000 rows, so page through.
const PAGE = 1000;

// Order owners: customer_id when set, otherwise the order's email (guest /
// admin-made orders) — same rule as /api/admin/customers/[id]/orders.
async function orderOwners() {
  const rows: { customer_id: string | null; email: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("orders")
      .select("customer_id, email")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

export async function GET() {
  const [{ data, error }, owners] = await Promise.all([
    supabase
      .from("customers")
      .select("id, first_name, last_name, email, auth_provider, facebook_url, instagram_url, tiktok_url, twitter_url, billing_phone, billing_city, billing_state, billing_address_1, billing_address_2, billing_postcode, billing_region, shipping_address_1, shipping_address_2, shipping_city, shipping_state, shipping_postcode, shipping_region, shipping_phone, is_blocked, block_reason, is_flaker, created_at")
      .order("created_at", { ascending: false }),
    orderOwners().catch((err: Error) => err),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (owners instanceof Error) return NextResponse.json({ error: owners.message }, { status: 500 });

  const byId = new Map<string, number>();
  const byEmail = new Map<string, number>();
  for (const o of owners) {
    if (o.customer_id) byId.set(o.customer_id, (byId.get(o.customer_id) ?? 0) + 1);
    else if (o.email) {
      const email = o.email.toLowerCase();
      byEmail.set(email, (byEmail.get(email) ?? 0) + 1);
    }
  }

  const customers = (data ?? []).map((c) => ({
    ...c,
    order_count: (byId.get(c.id) ?? 0) + (c.email ? byEmail.get(c.email.toLowerCase()) ?? 0 : 0),
  }));
  return NextResponse.json(customers, { headers: { "Cache-Control": "no-store" } });
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
    is_blocked = false, block_reason = "",
    is_flaker = false, flaker_reason = "",
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
      is_blocked: Boolean(is_blocked), block_reason: block_reason || null,
      is_flaker: Boolean(is_flaker), flaker_reason: flaker_reason || null,
    })
    .eq("id", authData.user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
