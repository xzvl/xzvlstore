// Client-safe bundle types and helpers. Server-side lookups live in lib/bundles.ts.

export type BundleItemRef = { product_id: string; qty: number };

export type DbBundle = {
  id: string;
  name: string;
  /** What the customer pays for one bundle. */
  price: number;
  image: string | null;
  items: BundleItemRef[];
  status: "active" | "inactive";
  /** Caps how many of this bundle one customer can buy per rolling window. */
  max_purchase_enabled?: boolean | null;
  max_purchase_limit?: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** One product inside a bundle, joined with its live product data. */
export type BundleComponent = {
  product_id: string;
  name: string;
  slug: string;
  sku: string | null;
  image: string | null;
  qty: number;
  /** The product's normal selling price (sale price if set, else regular price). */
  unit_price: number;
  stock: number;
  pre_order: boolean;
  sneak_peek: boolean;
  /** False when the product is missing, inactive, a sneak peek or a pre-order item. */
  available: boolean;
};

/** Pre-order and sneak-peek products can be bundled, but they keep the bundle disabled. */
export const blocksBundle = (p: { pre_order?: boolean | null; sneak_peek?: boolean | null }) =>
  !!p.pre_order || !!p.sneak_peek;

export const BUNDLE_BLOCKED_REASON =
  "This bundle has a pre-order or sneak-peek product, so it stays disabled.";

export type ResolvedBundle = DbBundle & {
  components: BundleComponent[];
  /** Sum of the included products at their normal price. */
  regular_total: number;
  /** regular_total − price, never below 0. */
  discount: number;
  /** How many bundles can be sold: the lowest product stock ÷ its qty in the bundle. */
  stock: number;
  /** Every included product can be bought right now (ignores stock). */
  available: boolean;
};

const CART_PREFIX = "bundle:";

/** Cart line id for a bundle — kept distinct from product ids. */
export const bundleCartId = (bundleId: string) => `${CART_PREFIX}${bundleId}`;

export const parseBundleCartId = (cartId: string): string | null =>
  cartId.startsWith(CART_PREFIX) ? cartId.slice(CART_PREFIX.length) : null;

/** Merges duplicate products and drops anything that isn't a valid { product_id, qty ≥ 1 }. */
export function sanitizeBundleItems(raw: unknown): BundleItemRef[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<string, number>();
  for (const it of raw) {
    const id = typeof it?.product_id === "string" ? it.product_id.trim() : "";
    const qty = Math.floor(Number(it?.qty));
    if (!id || !Number.isFinite(qty) || qty < 1) continue;
    byId.set(id, (byId.get(id) ?? 0) + qty);
  }
  return Array.from(byId, ([product_id, qty]) => ({ product_id, qty }));
}

/**
 * Cart prices for one bundle: `price` is the products' normal total and
 * `sale_price` the bundle price. The customer never pays more than buying the
 * products separately, matching how checkout applies the discount.
 */
export function bundleCartPrices(b: { price: number; regular_total: number }) {
  const pay = Math.min(b.price, b.regular_total);
  return { price: b.regular_total, sale_price: pay < b.regular_total ? pay : null };
}

/** The bundle's per-customer limit, or null when it has none. */
export const bundlePurchaseLimit = (b: Pick<DbBundle, "max_purchase_enabled" | "max_purchase_limit">) =>
  b.max_purchase_enabled && b.max_purchase_limit ? b.max_purchase_limit : null;

/** The bundle's own image, else the first included product's image. */
export const bundleImage = (b: { image: string | null; components: { image: string | null }[] }) =>
  b.image || b.components.find((c) => c.image)?.image || null;

export const percentOff =(b: { regular_total: number; discount: number }) =>
  b.regular_total > 0 ? Math.round((b.discount / b.regular_total) * 100) : 0;
