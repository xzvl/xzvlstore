import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Favorites / waitlist counts per product for the /admin/products table:
// { [productId]: { favorites, waitlist } }. Products with neither are omitted.

export type ListCounts = Record<string, { favorites: number; waitlist: number }>;

// PostgREST caps a select at 1000 rows, so page through.
const PAGE = 1000;

async function productIds(table: "favorites" | "waitlist") {
  const ids: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select("product_id")
      .order("product_id")
      .order("customer_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    ids.push(...(data ?? []).map((r) => r.product_id as string));
    if (!data || data.length < PAGE) return ids;
  }
}

export async function GET() {
  try {
    const [favorites, waitlist] = await Promise.all([productIds("favorites"), productIds("waitlist")]);
    const counts: ListCounts = {};
    for (const id of favorites) (counts[id] ??= { favorites: 0, waitlist: 0 }).favorites++;
    for (const id of waitlist) (counts[id] ??= { favorites: 0, waitlist: 0 }).waitlist++;
    return NextResponse.json(counts, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load counts." }, { status: 500 });
  }
}
