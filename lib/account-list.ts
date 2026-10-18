import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Shared GET/POST/DELETE handlers for the customer's product lists
// (favorites = hearted products, waitlist = "notify me" products). Both tables
// are (customer_id, product_id, created_at) and are only reachable through
// these routes with the service-role client.

export type ListedProduct = {
  id: string;
  slug: string | null;
  name: string;
  price: number;
  sale_price: number | null;
  stock: number;
  image: string | null;
  pre_order: boolean;
  sneak_peek: boolean;
  status: "active" | "inactive";
  added_at: string;
};

const PRODUCT_FIELDS = "id, slug, name, price, sale_price, stock, image, main_image, pre_order, sneak_peek, status";

async function getUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

const nameToSlug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function makeListHandlers(table: "favorites" | "waitlist", opts: { publicCount?: boolean } = {}) {
  return {
    // No query: the signed-in customer's list (with product details).
    // ?product_id=X: { count, active } for one product — `count` only when publicCount,
    // `active` only when signed in.
    async GET(req: NextRequest) {
      const productId = new URL(req.url).searchParams.get("product_id");

      if (productId) {
        const user = await getUser(req);
        const [countRes, mineRes] = await Promise.all([
          opts.publicCount
            ? supabase.from(table).select("product_id", { count: "exact", head: true }).eq("product_id", productId)
            : Promise.resolve({ count: null }),
          user
            ? supabase.from(table).select("product_id").eq("customer_id", user.id).eq("product_id", productId).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        return NextResponse.json(
          { count: countRes.count ?? 0, active: !!mineRes.data },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      const user = await getUser(req);
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data: rows, error } = await supabase
        .from(table)
        .select("product_id, created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!rows?.length) return NextResponse.json([]);

      const { data: products } = await supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .in("id", rows.map((r) => r.product_id));
      const byId = new Map((products ?? []).map((p) => [p.id as string, p]));

      const result: ListedProduct[] = rows.flatMap((r) => {
        const p = byId.get(r.product_id);
        if (!p) return [];
        return [{
          id: p.id,
          slug: p.slug || nameToSlug(p.name),
          name: p.name,
          price: Number(p.price),
          sale_price: p.sale_price != null ? Number(p.sale_price) : null,
          stock: p.stock ?? 0,
          image: p.main_image ?? p.image ?? null,
          pre_order: !!p.pre_order,
          sneak_peek: !!p.sneak_peek,
          status: p.status,
          added_at: r.created_at,
        }];
      });
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    },

    async POST(req: NextRequest) {
      const user = await getUser(req);
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const { product_id } = await req.json().catch(() => ({}));
      if (typeof product_id !== "string" || !product_id) {
        return NextResponse.json({ error: "product_id is required." }, { status: 400 });
      }

      // The customers row normally exists from sign-up; make sure of it so the FK holds.
      await supabase.from("customers").upsert({ id: user.id, email: user.email! }, { onConflict: "id", ignoreDuplicates: true });

      const { error } = await supabase
        .from(table)
        .upsert({ customer_id: user.id, product_id }, { onConflict: "customer_id,product_id", ignoreDuplicates: true });
      if (error) {
        const status = error.code === "23503" ? 404 : 500;
        return NextResponse.json({ error: status === 404 ? "Product not found." : error.message }, { status });
      }
      return NextResponse.json({ success: true });
    },

    async DELETE(req: NextRequest) {
      const user = await getUser(req);
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const productId = new URL(req.url).searchParams.get("product_id");
      if (!productId) return NextResponse.json({ error: "product_id is required." }, { status: 400 });

      const { error } = await supabase.from(table).delete().eq("customer_id", user.id).eq("product_id", productId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    },
  };
}
