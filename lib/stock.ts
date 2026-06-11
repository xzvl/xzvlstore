import { supabase } from "./supabase";

export const DEDUCTING_STATUSES = new Set([
  "pre-order", "processing", "confirmed", "shipped", "completed",
]);

type StockItem = { product_id?: string | null; qty: number };

export async function adjustStock(items: StockItem[], delta: number) {
  for (const item of items) {
    if (!item.product_id) continue;
    const { data } = await supabase
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .single();
    if (!data) continue;
    await supabase
      .from("products")
      .update({ stock: Math.max(0, (data.stock ?? 0) + delta * item.qty) })
      .eq("id", item.product_id);
  }
}
