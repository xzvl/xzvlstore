// Server-only J&T Express client (imports the service-role Supabase client).
// The API base URL, sender address and service type come from
// /admin/content → Shipping.

import { supabase } from "@/lib/supabase";
import { getSiteContent } from "@/lib/get-site-content";
import {
  orderParcel,
  prettyAreaName,
  POUCH_CODE,
  isPouchSize,
  type Area,
  type ShippingProfile,
  type ShippingQuote,
} from "@/lib/shipping";

type JntResponse<T> = { code?: number; succ?: boolean; msg?: string; data?: T };
type RawArea = { id: number | string; code?: string; nativeName?: string };

// Province and city lists hardly ever change — cache them for a day.
const AREA_REVALIDATE_SECONDS = 60 * 60 * 24;

async function fetchRawAreas(parentId?: string): Promise<RawArea[]> {
  const { shipping } = await getSiteContent();
  const qs = new URLSearchParams({ countryCode: "PH", current: "1", size: "9999" });
  if (parentId) qs.set("parentId", parentId);
  const res = await fetch(`${shipping.jntApiEndpoint}/website/base/info/area?${qs}`, {
    next: { revalidate: AREA_REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`J&T areas ${res.status}`);
  const json = (await res.json()) as JntResponse<{ records?: RawArea[] }>;
  if (json.code !== 1 || !Array.isArray(json.data?.records)) throw new Error(`J&T areas: ${json.msg ?? "bad response"}`);
  return json.data.records.filter((a) => a.id != null && a.nativeName);
}

/** All provinces, or the cities of one province (by its J&T id). */
export async function getAreas(parentId?: string): Promise<Area[]> {
  const records = await fetchRawAreas(parentId);
  let parentNative: string | undefined;
  if (parentId) {
    parentNative = (await fetchRawAreas()).find((p) => String(p.id) === parentId)?.nativeName;
  }
  return records
    .map((a) => ({ id: String(a.id), nativeName: a.nativeName!, name: prettyAreaName(a.nativeName!, parentNative) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The J&T name of a city, checked against its province. Null if it isn't one of that province's cities. */
export async function resolveCityNativeName(provinceId: string, cityId: string): Promise<string | null> {
  if (!provinceId || !cityId) return null;
  const city = (await fetchRawAreas(provinceId)).find((c) => String(c.id) === cityId);
  return city?.nativeName ?? null;
}

async function shippingProfiles(productIds: string[]): Promise<Map<string, ShippingProfile>> {
  if (productIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("products")
    .select("id, pouch_size, pouch_upgrade_medium_qty, pouch_upgrade_large_qty, weight")
    .in("id", productIds);
  if (error) {
    // Columns not migrated yet — price by weight with no pouch.
    console.error("[jnt] Could not read product shipping fields:", error.message);
    return new Map();
  }
  return new Map(
    (data ?? []).map((p) => [
      p.id as string,
      {
        pouch_size: isPouchSize(p.pouch_size) ? p.pouch_size : null,
        pouch_upgrade_medium_qty: p.pouch_upgrade_medium_qty != null ? Number(p.pouch_upgrade_medium_qty) : null,
        pouch_upgrade_large_qty: p.pouch_upgrade_large_qty != null ? Number(p.pouch_upgrade_large_qty) : null,
        weight: p.weight != null ? Number(p.weight) : null,
      },
    ])
  );
}

/**
 * Quotes the J&T Express fee for delivering these products to a city. Pouch
 * size and weight come from the product rows, never from the client.
 */
export async function quoteShipping({
  items,
  provinceId,
  cityId,
  goodsValue,
}: {
  items: { product_id?: string | null; qty: number }[];
  provinceId: string;
  cityId: string;
  goodsValue: number;
}): Promise<ShippingQuote> {
  const receiverAddr = await resolveCityNativeName(provinceId, cityId);
  if (!receiverAddr) throw new Error("Unknown city for this province.");

  // Merge lines of the same product so quantity upgrades see the full count.
  const qtyById = new Map<string, number>();
  for (const it of items) {
    const qty = Math.max(0, Math.floor(Number(it.qty) || 0));
    if (it.product_id && qty > 0) qtyById.set(it.product_id, (qtyById.get(it.product_id) ?? 0) + qty);
  }
  const profiles = await shippingProfiles(Array.from(qtyById.keys()));
  const { pouch, weight } = orderParcel(
    Array.from(qtyById, ([id, qty]) => ({ profile: profiles.get(id) ?? {}, qty }))
  );

  const { shipping } = await getSiteContent();
  const res = await fetch(`${shipping.jntApiEndpoint}/website/fee/findRates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      country: "PH",
      senderAddr: shipping.senderAddr,
      receiverAddr,
      weight: String(weight > 0 ? weight : 1),
      goodType: "PARCEL",
      productType: shipping.productType,
      goodsValue: String(Math.max(0, Math.round(goodsValue))),
      dimensionW: "",
      dimensionH: "",
      dimensionL: "",
      pouchSize: pouch ? POUCH_CODE[pouch] : "",
    }),
  });
  if (!res.ok) throw new Error(`J&T rates ${res.status}`);
  const json = (await res.json()) as JntResponse<{ fees?: string; type?: string }[]>;
  if (json.code !== 1 || !Array.isArray(json.data)) throw new Error(`J&T rates: ${json.msg ?? "bad response"}`);

  const sum = (type: string) =>
    json.data!.filter((f) => f.type === type).reduce((s, f) => s + (Number(f.fees) || 0), 0);
  const shippingFee = sum("fee");
  const valuationFee = sum("insured");
  return { fee: shippingFee + valuationFee, shippingFee, valuationFee, pouch, weight };
}
