// Shared (client + server) shipping helpers. The J&T API calls themselves live
// in lib/jnt.ts (server only).

export const DELIVERY_METHODS = { jnt: "J&T Express", pickup: "Pickup" } as const;
export type DeliveryMethod = keyof typeof DELIVERY_METHODS;

/** A J&T province or city, as returned by /api/shipping/areas. */
export type Area = {
  id: string;
  /** Display name, e.g. "San Fernando City". */
  name: string;
  /** J&T's own name, e.g. "PAMPANGA-SAN-FERNANDO-CITY" — what findRates expects. */
  nativeName: string;
};

/** Province/city ids picked from the J&T area lists, stored with the address. */
export type AddressAreaIds = { province_id: string; city_id: string };

// J&T area names are upper-case and hyphenated, and cities that share a name
// across provinces are prefixed with the province ("PAMPANGA-SAN-FERNANDO-CITY").
export function prettyAreaName(nativeName: string, parentNativeName?: string): string {
  let n = nativeName.trim();
  if (parentNativeName && n.startsWith(`${parentNativeName}-`) && n.length > parentNativeName.length + 1) {
    n = n.slice(parentNativeName.length + 1);
  }
  return n
    .toLowerCase()
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Pouch size ─────────────────────────────────────────────────────────────

export const POUCH_SIZES = ["small", "medium", "large"] as const;
export type PouchSize = (typeof POUCH_SIZES)[number];

/** J&T findRates pouchSize codes: 1 is large, 2 is medium, 3 is small. */
export const POUCH_CODE: Record<PouchSize, string> = { large: "1", medium: "2", small: "3" };

export const POUCH_LABEL: Record<PouchSize, string> = { small: "Small", medium: "Medium", large: "Large" };

const POUCH_RANK: Record<PouchSize, number> = { small: 1, medium: 2, large: 3 };

export const isPouchSize = (v: unknown): v is PouchSize => POUCH_SIZES.includes(v as PouchSize);

export type ShippingProfile = {
  pouch_size?: PouchSize | null;
  /** Ordering at least this many units (of this product) needs a medium pouch. */
  pouch_upgrade_medium_qty?: number | null;
  /** Ordering at least this many units (of this product) needs a large pouch. */
  pouch_upgrade_large_qty?: number | null;
  /** Kilograms per unit. */
  weight?: number | null;
};

/** The pouch one order line needs, after any quantity upgrade. Null = no pouch size set. */
export function pouchForLine(p: ShippingProfile, qty: number): PouchSize | null {
  if (!isPouchSize(p.pouch_size)) return null;
  let size: PouchSize = p.pouch_size;
  if (size !== "large" && p.pouch_upgrade_large_qty && qty >= p.pouch_upgrade_large_qty) return "large";
  if (size === "small" && p.pouch_upgrade_medium_qty && qty >= p.pouch_upgrade_medium_qty) size = "medium";
  return size;
}

/**
 * The parcel for a whole order: the largest pouch any line needs, and the total
 * weight. pouch is null when no product on the order has a pouch size — J&T
 * then prices by weight.
 */
export function orderParcel(lines: { profile: ShippingProfile; qty: number }[]): { pouch: PouchSize | null; weight: number } {
  let pouch: PouchSize | null = null;
  let weight = 0;
  for (const { profile, qty } of lines) {
    const size = pouchForLine(profile, qty);
    if (size && (!pouch || POUCH_RANK[size] > POUCH_RANK[pouch])) pouch = size;
    weight += Math.max(0, Number(profile.weight) || 0) * qty;
  }
  return { pouch, weight: Math.round(weight * 1000) / 1000 };
}

const positiveInt = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Cleans the shipping fields from the admin product form: upgrade quantities
 * only apply to the sizes above the base one (small → medium/large, medium → large).
 */
export function normalizeShippingFields(body: Record<string, unknown>) {
  const pouch_size = isPouchSize(body.pouch_size) ? body.pouch_size : null;
  const weight = Number(body.weight);
  return {
    pouch_size,
    pouch_upgrade_medium_qty: pouch_size === "small" ? positiveInt(body.pouch_upgrade_medium_qty) : null,
    pouch_upgrade_large_qty: pouch_size === "small" || pouch_size === "medium" ? positiveInt(body.pouch_upgrade_large_qty) : null,
    weight: Number.isFinite(weight) && weight > 0 ? Math.round(weight * 1000) / 1000 : null,
  };
}

/** What /api/shipping/quote returns. */
export type ShippingQuote = {
  /** Total charged to the customer: shippingFee + valuationFee. */
  fee: number;
  shippingFee: number;
  /** J&T's "insured" fee, based on the goods value. */
  valuationFee: number;
  pouch: PouchSize | null;
  weight: number;
};
