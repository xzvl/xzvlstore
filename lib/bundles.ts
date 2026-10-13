import { supabase } from "@/lib/supabase";
import { blocksBundle, type BundleComponent, type BundleItemRef, type DbBundle, type ResolvedBundle } from "@/lib/bundle-types";

const toSlug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Joins each bundle with the live data of the products it includes and derives
 * its regular total, discount, stock (lowest product stock ÷ qty) and whether
 * every product in it can currently be bought.
 */
export async function resolveBundles(rows: DbBundle[]): Promise<ResolvedBundle[]> {
  const ids = Array.from(new Set(rows.flatMap((b) => (b.items ?? []).map((it) => it.product_id))));
  const { data: products } = ids.length
    ? await supabase
        .from("products")
        .select("id, name, slug, sku, price, sale_price, stock, main_image, image, status, sneak_peek, pre_order")
        .in("id", ids)
    : { data: [] };
  const byId = new Map((products ?? []).map((p) => [p.id as string, p]));

  return rows.map((b) => {
    const components: BundleComponent[] = (b.items ?? []).map((it) => {
      const p = byId.get(it.product_id);
      if (!p) {
        return {
          product_id: it.product_id, name: "Deleted product", slug: "", sku: null, image: null,
          qty: it.qty, unit_price: 0, stock: 0, pre_order: false, sneak_peek: false, available: false,
        };
      }
      return {
        product_id: it.product_id,
        name: p.name as string,
        slug: (p.slug as string | null) || toSlug(p.name as string),
        sku: (p.sku as string | null) ?? null,
        image: (p.main_image as string | null) ?? ((p.image as string | null) || null),
        qty: it.qty,
        unit_price: Number(p.sale_price ?? p.price) || 0,
        stock: Number(p.stock) || 0,
        pre_order: !!p.pre_order,
        sneak_peek: !!p.sneak_peek,
        available: p.status === "active" && !blocksBundle(p),
      };
    });

    const regular_total = components.reduce((s, c) => s + c.unit_price * c.qty, 0);
    const price = Number(b.price) || 0;
    const stock = components.length
      ? Math.max(0, Math.min(...components.map((c) => Math.floor(c.stock / c.qty))))
      : 0;

    return {
      ...b,
      price,
      components,
      regular_total,
      discount: Math.max(0, regular_total - price),
      stock,
      available: components.length > 0 && components.every((c) => c.available),
    };
  });
}

/** Bundles that can be shown and bought on the storefront, in admin order. */
export async function getStoreBundles(): Promise<ResolvedBundle[]> {
  const { data } = await supabase
    .from("bundles")
    .select("*")
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  const resolved = await resolveBundles((data ?? []) as DbBundle[]);
  return resolved.filter((b) => b.available && b.stock > 0);
}

/** Whether any of these bundle items is a pre-order or sneak-peek product. */
export async function hasBlockingProduct(items: BundleItemRef[]): Promise<boolean> {
  const ids = items.map((it) => it.product_id);
  if (ids.length === 0) return false;
  const { data } = await supabase.from("products").select("pre_order, sneak_peek").in("id", ids);
  return (data ?? []).some(blocksBundle);
}

/**
 * Turns off every enabled bundle that includes this product. Called when a
 * product becomes a pre-order or sneak peek, since those can't be checked out.
 */
export async function disableBundlesWithProduct(productId: string) {
  const { data } = await supabase.from("bundles").select("id, items").eq("status", "active");
  const ids = (data ?? [])
    .filter((b) => ((b.items ?? []) as BundleItemRef[]).some((it) => it.product_id === productId))
    .map((b) => b.id as string);
  if (ids.length === 0) return;
  await supabase
    .from("bundles")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .in("id", ids);
}

export async function getBundlesByIds(ids: string[]): Promise<ResolvedBundle[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase.from("bundles").select("*").in("id", ids);
  return resolveBundles((data ?? []) as DbBundle[]);
}
