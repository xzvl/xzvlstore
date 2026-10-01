import { supabase } from "@/lib/supabase";
import type { Order } from "@/lib/supabase";

const toSlug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Attaches each order item's current product thumbnail and slug (looked up
 * by `product_id`) so order lists can render a small image per line item and
 * link it to /product/[slug]. Purely a read-time convenience — nothing is
 * written back to the row.
 */
export async function attachItemImages(orders: Order[]): Promise<Order[]> {
  const ids = Array.from(
    new Set(
      orders.flatMap((o) => o.items.map((it) => it.product_id).filter(Boolean) as string[])
    )
  );
  if (ids.length === 0) return orders;

  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, main_image, image")
    .in("id", ids);

  const infoById = new Map<string, { image: string | null; slug: string | null }>(
    (products ?? []).map((p) => [
      p.id as string,
      {
        image: (p.main_image as string | null) ?? (p.image as string | null) ?? null,
        slug: (p.slug as string | null) || toSlug(p.name as string),
      },
    ])
  );

  return orders.map((o) => ({
    ...o,
    items: o.items.map((it) => {
      const info = it.product_id ? infoById.get(it.product_id) : undefined;
      return { ...it, image: info?.image ?? null, slug: info?.slug ?? null };
    }),
  }));
}
