import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { revalidateStorefront } from "@/lib/revalidate";

// Persists a drag-and-drop reorder from /admin/products in a single request.
// Body: { order: { id: string; sort_order: number }[] } — only the products
// whose position changed.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const order = body?.order;

  if (
    !Array.isArray(order) ||
    order.some((o) => typeof o?.id !== "string" || !Number.isFinite(Number(o?.sort_order)))
  ) {
    return NextResponse.json({ error: "Invalid order payload." }, { status: 400 });
  }

  const results = await Promise.all(
    (order as { id: string; sort_order: number }[]).map((o) =>
      supabase.from("products").update({ sort_order: Number(o.sort_order) }).eq("id", o.id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  revalidateStorefront();
  return NextResponse.json({ success: true });
}
