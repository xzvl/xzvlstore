import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getBundlesByIds } from "@/lib/bundles";
import { bundleImage, bundlePurchaseLimit } from "@/lib/bundle-types";
import { getPurchasedBundleQtyMap } from "@/lib/purchase-limit";

export const dynamic = "force-dynamic";

// Live bundle data used to re-validate bundle lines in the cart before
// checkout (status, stock, current price, included products and purchase
// limit). If an Authorization bearer token is supplied, also folds in how many
// of each limited bundle the customer already bought within the rolling window.
export async function GET(req: NextRequest) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const bundles = await getBundlesByIds(ids);

  let purchasedMap = new Map<string, number>();
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const limitedIds = bundles.filter((b) => bundlePurchaseLimit(b) != null).map((b) => b.id);
  if (token && limitedIds.length > 0) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) purchasedMap = await getPurchasedBundleQtyMap(user.id, limitedIds);
  }

  return NextResponse.json(
    bundles.map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      available: b.available,
      stock: b.stock,
      price: b.price,
      regular_total: b.regular_total,
      image: bundleImage(b),
      components: b.components.map((c) => ({
        product_id: c.product_id, name: c.name, qty: c.qty, unit_price: c.unit_price,
      })),
      max_purchase_limit: bundlePurchaseLimit(b),
      purchased_in_window: purchasedMap.get(b.id) ?? 0,
    })),
    { headers: { "Cache-Control": "no-store" } }
  );
}
