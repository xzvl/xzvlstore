import { supabase } from "@/lib/supabase";
import type { Order } from "@/lib/supabase";

/**
 * Attaches each order item's current product thumbnail (looked up by
 * `product_id`) so order lists can render a small image per line item.
 * Purely a read-time convenience — nothing is written back to the row.
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
    .select("id, main_image, image")
    .in("id", ids);

  const imageById = new Map<string, string | null>(
    (products ?? []).map((p) => [
      p.id as string,
      (p.main_image as string | null) ?? (p.image as string | null) ?? null,
    ])
  );

  return orders.map((o) => ({
    ...o,
    items: o.items.map((it) => ({
      ...it,
      image: it.product_id ? imageById.get(it.product_id) ?? null : null,
    })),
  }));
}
