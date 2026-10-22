import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { revalidateStorefront } from "@/lib/revalidate";
import { hasBlockingProduct, resolveBundles } from "@/lib/bundles";
import { sanitizeBundleItems, type DbBundle } from "@/lib/bundle-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("bundles")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const resolved = await resolveBundles((data ?? []) as DbBundle[]);
  return NextResponse.json(resolved, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = Number(body.price);
  const items = sanitizeBundleItems(body.items);

  if (!name) return NextResponse.json({ error: "Bundle name is required." }, { status: 400 });
  if (!Number.isFinite(price) || price < 0)
    return NextResponse.json({ error: "Enter a valid bundle price." }, { status: 400 });
  if (items.length === 0)
    return NextResponse.json({ error: "Add at least one product to the bundle." }, { status: 400 });

  // New bundles go to the end of the list.
  const { data: last } = await supabase
    .from("bundles")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("bundles")
    .insert({
      name,
      price,
      items,
      image: body.image || null,
      max_purchase_enabled: Boolean(body.max_purchase_enabled),
      max_purchase_limit: body.max_purchase_limit ? Number(body.max_purchase_limit) : null,
      // A pre-order or sneak-peek product keeps the bundle disabled.
      status: body.status === "inactive" || (await hasBlockingProduct(items)) ? "inactive" : "active",
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateStorefront();
  const [resolved] = await resolveBundles([data as DbBundle]);
  return NextResponse.json(resolved, { status: 201 });
}
