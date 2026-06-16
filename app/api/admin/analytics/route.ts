import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RawItem = { product?: string; qty?: number; subtotal?: number; product_id?: string | null };
type RawOrder = { created_at: string; estimated_total: number; discount: number; items: RawItem[] };

function computePerformance(orders: RawOrder[]) {
  const totalSales = orders.reduce((s, o) => s + (o.estimated_total ?? 0) + (o.discount ?? 0), 0);
  const netSales = orders.reduce((s, o) => s + (o.estimated_total ?? 0), 0);
  const productsSold = orders.reduce((s, o) => {
    const items = Array.isArray(o.items) ? o.items : [];
    return s + items.reduce((ss, i) => ss + (i.qty ?? 0), 0);
  }, 0);
  return { totalSales, netSales, orders: orders.length, productsSold };
}

async function fetchOrders(from: string, to: string) {
  return supabase
    .from("orders")
    .select("created_at, estimated_total, discount, items")
    .gte("created_at", from)
    .lte("created_at", to)
    .eq("status", "completed");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const compareFrom = searchParams.get("compareFrom");
  const compareTo = searchParams.get("compareTo");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const [ordersResult, compareResult, productsResult, brandsResult] = await Promise.all([
    fetchOrders(from, to),
    compareFrom && compareTo ? fetchOrders(compareFrom, compareTo) : Promise.resolve({ data: null, error: null }),
    supabase.from("products").select("id, name, brand_id, brands"),
    supabase.from("taxonomy").select("id, name").eq("type", "brand"),
  ]);

  if (ordersResult.error) {
    return NextResponse.json({ error: ordersResult.error.message }, { status: 500 });
  }

  const orders: RawOrder[] = (ordersResult.data ?? []) as RawOrder[];
  const compareOrders: RawOrder[] | null = compareResult.data ? (compareResult.data as RawOrder[]) : null;
  const products = productsResult.data ?? [];
  const brandTax = brandsResult.data ?? [];

  const productById = new Map(products.map((p) => [p.id, p]));
  const productByName = new Map(products.map((p) => [p.name, p]));
  const brandById = new Map(brandTax.map((b) => [b.id, b.name]));

  const brandStats = new Map<string, { itemsSold: number; netSales: number }>();
  const productStats = new Map<string, { itemsSold: number; netSales: number }>();

  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const name = item.product ?? "";
      const qty = item.qty ?? 0;
      const subtotal = item.subtotal ?? 0;

      if (name) {
        const ps = productStats.get(name) ?? { itemsSold: 0, netSales: 0 };
        productStats.set(name, { itemsSold: ps.itemsSold + qty, netSales: ps.netSales + subtotal });
      }

      const prod = (item.product_id ? productById.get(item.product_id) : undefined) ?? productByName.get(name);
      const brandName = prod
        ? ((prod.brand_id ? brandById.get(prod.brand_id) : undefined) ?? prod.brands ?? null)
        : null;

      if (brandName) {
        const bs = brandStats.get(brandName) ?? { itemsSold: 0, netSales: 0 };
        brandStats.set(brandName, { itemsSold: bs.itemsSold + qty, netSales: bs.netSales + subtotal });
      }
    }
  }

  const topBrands = Array.from(brandStats.entries())
    .map(([brand, s]) => ({ brand, ...s }))
    .sort((a, b) => b.itemsSold - a.itemsSold)
    .slice(0, 10);

  const topProducts = Array.from(productStats.entries())
    .map(([product, s]) => ({ product, ...s }))
    .sort((a, b) => b.itemsSold - a.itemsSold)
    .slice(0, 10);

  const slim = (o: RawOrder) => ({
    created_at: o.created_at,
    estimated_total: o.estimated_total,
    discount: o.discount,
    items: o.items,
  });

  return NextResponse.json({
    performance: computePerformance(orders),
    comparePerformance: compareOrders ? computePerformance(compareOrders) : null,
    currentOrders: orders.map(slim),
    compareOrders: compareOrders ? compareOrders.map(slim) : null,
    topBrands,
    topProducts,
  });
}
