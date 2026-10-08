import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { downPaymentPerUnit } from "@/lib/store-types";

export type HoldPreOrder = {
  id: string;
  order_number: number | null;
  created_at: string;
  products: string[];
  /** Down payment the order's products require, from their current settings. 0 = none. */
  required_down_payment: number;
  /** What the admin has recorded as paid so far. */
  down_payment: number;
  /** "payment": down payment still owed. "confirmation": only the confirmation screenshot is missing. */
  reason: "payment" | "confirmation";
};

// The signed-in customer's "hold pre-order" orders that still need something
// from them on Facebook — used by the once-a-day reminder popup.
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, created_at, items, down_payment")
    .eq("email", user.email)
    .eq("status", "hold pre-order")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!orders?.length) return NextResponse.json([]);

  type Item = { product_id?: string | null; product: string; qty: number };
  const productIds = Array.from(
    new Set(orders.flatMap((o) => ((o.items ?? []) as Item[]).map((it) => it.product_id).filter((id): id is string => !!id)))
  );
  const { data: products } = productIds.length
    ? await supabase
        .from("products")
        .select("id, pre_order, down_payment_required, down_payment_price")
        .in("id", productIds)
    : { data: [] };
  const perUnit = new Map((products ?? []).map((p) => [p.id as string, downPaymentPerUnit(p)]));

  const result: HoldPreOrder[] = orders.flatMap((o) => {
    const items = (o.items ?? []) as Item[];
    const required = items.reduce((s, it) => s + (perUnit.get(it.product_id ?? "") ?? 0) * (Number(it.qty) || 0), 0);
    const paid = Number(o.down_payment) || 0;
    // Down payment already settled — nothing left for the customer to send.
    if (required > 0 && paid >= required) return [];
    return [{
      id: o.id,
      order_number: o.order_number,
      created_at: o.created_at,
      products: items.map((it) => it.product),
      required_down_payment: required,
      down_payment: paid,
      reason: required > 0 ? "payment" : "confirmation",
    }];
  });

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
