import { NextRequest, NextResponse } from "next/server";
import { quoteShipping } from "@/lib/jnt";

export const dynamic = "force-dynamic";

// POST { items: [{ product_id, qty }], province_id, city_id, goods_value }
// → ShippingQuote. Only an estimate for the checkout/pre-order summary — the
// order itself is re-quoted in /api/pre-order.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  const provinceId = String(body?.province_id ?? "").trim();
  const cityId = String(body?.city_id ?? "").trim();
  if (!items.length || !provinceId || !cityId) {
    return NextResponse.json({ error: "Items, province and city are required." }, { status: 400 });
  }
  try {
    const quote = await quoteShipping({
      items: items.slice(0, 100).map((it: { product_id?: unknown; qty?: unknown }) => ({
        product_id: typeof it?.product_id === "string" ? it.product_id : null,
        qty: Number(it?.qty) || 0,
      })),
      provinceId,
      cityId,
      goodsValue: Number(body?.goods_value) || 0,
    });
    return NextResponse.json(quote);
  } catch (err) {
    console.error("[shipping/quote]", err);
    return NextResponse.json({ error: "Couldn't get a J&T Express rate right now." }, { status: 502 });
  }
}
