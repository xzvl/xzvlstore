import { NextRequest, NextResponse } from "next/server";
import { supabase, type Order } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Escapes LIKE wildcards so an email like "a_b@x.com" matches only itself.
const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// All orders of one customer, newest payment first. An order belongs to the
// customer by customer_id, or — for guest/admin-made orders without one — by
// matching email (same rule as the order count on /api/admin/customers).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("email")
    .eq("id", id)
    .single();
  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 404 });

  const [byId, byEmail] = await Promise.all([
    supabase.from("orders").select("*").eq("customer_id", id),
    customer.email
      ? supabase.from("orders").select("*").is("customer_id", null).ilike("email", likeExact(customer.email))
      : Promise.resolve({ data: [] as Order[], error: null }),
  ]);
  const error = byId.error ?? byEmail.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const paidAt = (o: Order) => new Date(o.payment_date ?? o.created_at).getTime();
  const orders = [...(byId.data ?? []), ...(byEmail.data ?? [])] as Order[];
  orders.sort((a, b) => paidAt(b) - paidAt(a));

  return NextResponse.json(orders, { headers: { "Cache-Control": "no-store" } });
}
