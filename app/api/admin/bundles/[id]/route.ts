import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { revalidateStorefront } from "@/lib/revalidate";
import { hasBlockingProduct, resolveBundles } from "@/lib/bundles";
import { sanitizeBundleItems, type BundleItemRef, type DbBundle } from "@/lib/bundle-types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabase.from("bundles").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  const [resolved] = await resolveBundles([data as DbBundle]);
  return NextResponse.json(resolved);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Bundle name is required." }, { status: 400 });
    updates.name = name;
  }
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0)
      return NextResponse.json({ error: "Enter a valid bundle price." }, { status: 400 });
    updates.price = price;
  }
  if (body.items !== undefined) {
    const items = sanitizeBundleItems(body.items);
    if (items.length === 0)
      return NextResponse.json({ error: "Add at least one product to the bundle." }, { status: 400 });
    updates.items = items;
  }
  if (body.image !== undefined) updates.image = body.image || null;
  if (body.status !== undefined) updates.status = body.status === "inactive" ? "inactive" : "active";

  // A pre-order or sneak-peek product keeps the bundle disabled, whichever
  // of status or items this request changes.
  if (updates.status === "active" || updates.items !== undefined) {
    let items = updates.items as BundleItemRef[] | undefined;
    if (!items) {
      const { data: current } = await supabase.from("bundles").select("items").eq("id", id).single();
      items = (current?.items ?? []) as BundleItemRef[];
    }
    if (await hasBlockingProduct(items)) updates.status = "inactive";
  }

  const { data, error } = await supabase
    .from("bundles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateStorefront();
  const [resolved] = await resolveBundles([data as DbBundle]);
  return NextResponse.json(resolved);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await supabase.from("bundles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateStorefront();
  return NextResponse.json({ success: true });
}
