import { supabase } from "@/lib/supabase";

// Per-product "max purchase limit" is a rolling window, not a lifetime cap —
// it frees back up 7 days after each purchase.
export const PURCHASE_LIMIT_WINDOW_DAYS = 7;

type OrderItem = { product_id?: string | null; qty?: number };

// Sums quantities purchased per product by this customer within the rolling
// window, across all non-cancelled orders (pending/pre-order/confirmed/etc.
// all count as a real purchase commitment — only cancelled orders don't).
export async function getPurchasedQtyMap(
  customerId: string,
  productIds: string[],
  windowDays: number = PURCHASE_LIMIT_WINDOW_DAYS
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!customerId || productIds.length === 0) return map;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("orders")
    .select("items")
    .eq("customer_id", customerId)
    .neq("status", "cancelled")
    .gte("created_at", since);

  for (const order of data ?? []) {
    const items = (order.items ?? []) as OrderItem[];
    for (const it of items) {
      if (it.product_id && productIds.includes(it.product_id)) {
        map.set(it.product_id, (map.get(it.product_id) ?? 0) + (Number(it.qty) || 0));
      }
    }
  }
  return map;
}
