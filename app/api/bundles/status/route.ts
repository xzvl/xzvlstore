import { NextRequest, NextResponse } from "next/server";
import { getBundlesByIds } from "@/lib/bundles";
import { bundleImage } from "@/lib/bundle-types";

export const dynamic = "force-dynamic";

// Live bundle data used to re-validate bundle lines in the cart before
// checkout (status, stock, current price and included products).
export async function GET(req: NextRequest) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const bundles = await getBundlesByIds(ids);
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
    })),
    { headers: { "Cache-Control": "no-store" } }
  );
}
