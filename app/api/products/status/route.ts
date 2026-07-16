import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPurchasedQtyMap } from "@/lib/purchase-limit";

// Lightweight bulk lookup used to re-validate cart contents (status, stock,
// purchase limit) against live product data before checkout. If an Authorization
// bearer token is supplied, also folds in how much of each limited product the
// requesting customer has already purchased within the rolling window.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("products")
    .select("id, status, stock, max_purchase_enabled, max_purchase_limit")
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const products = (data ?? []).map((p) => ({
    id: p.id as string,
    status: p.status as "active" | "inactive",
    stock: (p.stock as number | null) ?? 0,
    max_purchase_enabled: (p.max_purchase_enabled as boolean | null) ?? false,
    max_purchase_limit: (p.max_purchase_limit as number | null) ?? null,
    purchased_in_window: 0,
  }));

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      const limitedIds = products.filter((p) => p.max_purchase_enabled).map((p) => p.id);
      if (limitedIds.length > 0) {
        const purchasedMap = await getPurchasedQtyMap(user.id, limitedIds);
        for (const p of products) {
          p.purchased_in_window = purchasedMap.get(p.id) ?? 0;
        }
      }
    }
  }

  return NextResponse.json(products);
}
