import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Same as /api/admin/customers — no request-bound data read here, so force
// dynamic rendering to stop Vercel from caching a stale snapshot at the edge.
export const dynamic = "force-dynamic";

export async function GET() {
  const [ordersResult, productsResult] = await Promise.all([
    supabase.from("orders").select("status, estimated_total"),
    supabase.from("products").select("status"),
  ]);

  if (ordersResult.error || productsResult.error) {
    return NextResponse.json({ error: "Failed to fetch stats." }, { status: 500 });
  }

  const orders = ordersResult.data;
  const products = productsResult.data;

  return NextResponse.json({
    totalOrders: orders.length,
    totalRevenue: orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + (o.estimated_total ?? 0), 0),
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    preOrderOrders: orders.filter((o) => o.status === "pre-order").length,
    holdPreOrderOrders: orders.filter((o) => o.status === "hold pre-order").length,
    confirmedOrders: orders.filter((o) => o.status === "confirmed").length,
    shippedOrders: orders.filter((o) => o.status === "shipped").length,
    completedOrders: orders.filter((o) => o.status === "completed").length,
    cancelledOrders: orders.filter((o) => o.status === "cancelled").length,
    activeProducts: products.filter((p) => p.status === "active").length,
  }, { headers: { "Cache-Control": "no-store" } });
}
