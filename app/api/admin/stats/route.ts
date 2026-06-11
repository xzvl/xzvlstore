import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
    totalRevenue: orders.reduce((sum, o) => sum + (o.estimated_total ?? 0), 0),
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    preOrderOrders: orders.filter((o) => o.status === "pre-order").length,
    confirmedOrders: orders.filter((o) => o.status === "confirmed").length,
    shippedOrders: orders.filter((o) => o.status === "shipped").length,
    completedOrders: orders.filter((o) => o.status === "completed").length,
    cancelledOrders: orders.filter((o) => o.status === "cancelled").length,
    activeProducts: products.filter((p) => p.status === "active").length,
  });
}
