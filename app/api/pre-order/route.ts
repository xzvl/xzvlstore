import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { adjustStock } from "@/lib/stock";
import { getPurchasedQtyMap, PURCHASE_LIMIT_WINDOW_DAYS } from "@/lib/purchase-limit";
import { downPaymentPerUnit } from "@/lib/store-types";
import { getBundlesByIds } from "@/lib/bundles";
import { verifyPayment, verificationNote, type PaymentVerification } from "@/lib/payment-proof";
import { loadPaymentProof, isDuplicateReference } from "@/lib/payment-proof-ocr";
import { quoteShipping } from "@/lib/jnt";
import { DELIVERY_METHODS, POUCH_LABEL, type DeliveryMethod } from "@/lib/shipping";
import { getSiteContent } from "@/lib/get-site-content";
import {
  buildCheckoutEmailHtml,
  buildCustomerEmailHtml,
  buildPreOrderEmailHtml,
  resolveFromAddress,
  resolveOrderEmail,
  type OrderItem,
  type ShippingSummary,
} from "@/lib/email-templates";

// Re-reading a payment screenshot (if its saved OCR result is missing) can take a while.
export const maxDuration = 60;

const getResend = () => new Resend(process.env.RESEND_API_KEY);

type Address = {
  address_1: string; address_2: string; city: string; state: string; postcode: string; region: string;
  /** J&T Express area ids picked in the province/city dropdowns. */
  province_id?: string; city_id?: string;
};

// ─── Google Sheets via Apps Script ───────────────────────────────────────────

async function appendToSheet(payload: object) {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) throw new Error("APPS_SCRIPT_URL env var is not set.");

  // GET + query param is the reliable way to call Apps Script from a server.
  // POST redirects (302) convert to GET and drop the body; GET redirects follow cleanly.
  const qs = encodeURIComponent(JSON.stringify(payload));
  const res = await fetch(`${url}?payload=${qs}`, { method: "GET", redirect: "follow" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apps Script ${res.status}: ${text.slice(0, 200)}`);
  }
}

// ─── Order insert ─────────────────────────────────────────────────────────────

/**
 * Inserts the order with its payment-proof columns. If those columns aren't in
 * the database yet, saves the order without them (the proof summary is still
 * in the notes) rather than losing it.
 */
const isMissingColumn = (code?: string) => code === "42703" || code === "PGRST204";

async function insertOrder(
  row: Record<string, unknown> & { notes: string[] },
  proofFields: Record<string, unknown> & { proof_images: { url: string; type: string; uploaded_at: string }[] },
  /** J&T area ids + receiver name — dropped if those columns aren't migrated yet. */
  shippingFields: Record<string, unknown>
) {
  const full = await supabase.from("orders").insert({ ...row, ...proofFields, ...shippingFields });
  if (!full.error) return full;
  if (!isMissingColumn(full.error.code)) throw full.error;
  console.error("[pre-order] Shipping area columns missing — run the migration in supabase/schema.sql:", full.error.message);
  const first = await supabase.from("orders").insert({ ...row, ...proofFields });
  if (!first.error) return first;
  if (!isMissingColumn(first.error.code)) throw first.error;
  console.error("[pre-order] Payment proof columns missing — run the migration in supabase/schema.sql:", first.error.message);
  const retry = await supabase.from("orders").insert({
    ...row,
    notes: proofFields.proof_images.length
      ? [...row.notes, `Proof of payment image: ${proofFields.proof_images[0].url}`]
      : row.notes,
  });
  if (retry.error) throw retry.error;
  return retry;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, location, phone, email, facebook, items, estimatedTotal, payment_method, customer_id, billing, shipping, order_type, bundles, payment_proof_url, delivery_method, shipping_name } = body as {
      name: string;
      location: string;
      phone: string;
      email: string;
      facebook?: string;
      items: OrderItem[];
      estimatedTotal: number;
      payment_method?: string;
      customer_id?: string;
      billing?: Address;
      shipping?: Address;
      /** Defaults to J&T Express. */
      delivery_method?: DeliveryMethod;
      /** Receiver name for the J&T parcel. */
      shipping_name?: string;
      order_type?: "checkout" | "pre-order";
      /** Bundles in the cart. Their products are already expanded into `items`. */
      bundles?: { id: string; qty: number }[];
      /** Public URL returned by /api/payment-proof. Required for checkout, optional for pre-orders. */
      payment_proof_url?: string;
    };

    const isCheckout = order_type === "checkout";

    if (!name || !location || !phone || !email || !items?.length) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!facebook?.trim()) {
      return NextResponse.json({ error: "Facebook link is required." }, { status: 400 });
    }
    // Checkout needs a proof of payment; a pre-order can be placed without paying
    // (it's then put on hold until the customer pays).
    if (isCheckout && !payment_proof_url) {
      return NextResponse.json({ error: "Please upload your proof of payment." }, { status: 400 });
    }

    const phoneDigits = phone.replace(/[\s\-().+]/g, "");
    if (!/^(09\d{9}|639\d{9})$/.test(phoneDigits)) {
      return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("is_blocked")
        .eq("id", customer_id)
        .single();
      if (customer?.is_blocked) {
        return NextResponse.json({ error: "This account has been blocked and cannot place orders." }, { status: 403 });
      }

      const productIds = Array.from(new Set(items.map((it) => it.product_id).filter((id): id is string => !!id)));
      if (productIds.length > 0) {
        const { data: limitedProducts } = await supabase
          .from("products")
          .select("id, name, max_purchase_enabled, max_purchase_limit")
          .in("id", productIds)
          .eq("max_purchase_enabled", true);

        if (limitedProducts && limitedProducts.length > 0) {
          const purchasedMap = await getPurchasedQtyMap(customer_id, limitedProducts.map((p) => p.id));
          for (const p of limitedProducts) {
            const orderedQty = items
              .filter((it) => it.product_id === p.id)
              .reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
            const alreadyPurchased = purchasedMap.get(p.id) ?? 0;
            const limit = p.max_purchase_limit ?? Infinity;
            if (alreadyPurchased + orderedQty > limit) {
              const remainingAllowance = Math.max(0, limit - alreadyPurchased);
              return NextResponse.json(
                {
                  error: `Purchase limit reached for "${p.name}" — max ${limit} per customer every ${PURCHASE_LIMIT_WINDOW_DAYS} days (${remainingAllowance} remaining right now).`,
                },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    // Sneak-peek products can't be bought or pre-ordered, whatever the client sent.
    const orderedIds = Array.from(new Set(items.map((it) => it.product_id).filter((id): id is string => !!id)));
    if (orderedIds.length > 0) {
      const { data: sneakPeeks } = await supabase
        .from("products")
        .select("name")
        .in("id", orderedIds)
        .eq("sneak_peek", true);
      if (sneakPeeks && sneakPeeks.length > 0) {
        return NextResponse.json(
          { error: `"${sneakPeeks[0].name}" is a sneak peek and isn't available to order yet.` },
          { status: 400 }
        );
      }
    }

    // Pre-order products that require a down payment: only the down payment is
    // due now. Decided here from the product rows, never from what the client sent.
    const orderNotes: string[] = [];
    let requiredDp = 0;
    if (!isCheckout && orderedIds.length > 0) {
      const { data: dpProducts } = await supabase
        .from("products")
        .select("id, pre_order, down_payment_required, down_payment_price")
        .in("id", orderedIds)
        .eq("down_payment_required", true);
      requiredDp = (dpProducts ?? []).reduce((sum, p) => {
        const perUnit = downPaymentPerUnit(p);
        const qty = items.filter((it) => it.product_id === p.id).reduce((s, it) => s + (Number(it.qty) || 0), 0);
        return sum + perUnit * qty;
      }, 0);
      if (requiredDp > 0) {
        orderNotes.push(`Required down payment: ₱${requiredDp.toLocaleString()}${payment_method ? ` via ${payment_method}` : ""}.`);
      }
    }

    // Bundles: the order stores the individual products at their normal price;
    // the bundle's price off becomes the order discount, plus a note naming the
    // bundle. Prices and contents come from the bundle rows, never the client.
    let bundleDiscount = 0;
    const bundleReqs = (Array.isArray(bundles) ? bundles : [])
      .map((b) => ({ id: String(b?.id ?? ""), qty: Math.floor(Number(b?.qty)) }))
      .filter((b) => b.id && b.qty > 0);
    // Units of each product covered by the bundles on this order.
    const required = new Map<string, number>();
    if (bundleReqs.length > 0) {
      const resolved = new Map(
        (await getBundlesByIds(Array.from(new Set(bundleReqs.map((b) => b.id))))).map((b) => [b.id, b])
      );
      for (const req of bundleReqs) {
        const b = resolved.get(req.id);
        if (!b || b.status !== "active" || !b.available) {
          return NextResponse.json(
            { error: `${b ? `"${b.name}"` : "A bundle in your cart"} is no longer available.` },
            { status: 400 }
          );
        }
        if (req.qty > b.stock) {
          return NextResponse.json({ error: `Only ${b.stock} of "${b.name}" left in stock.` }, { status: 400 });
        }
        bundleDiscount += b.discount * req.qty;
        for (const c of b.components) {
          required.set(c.product_id, (required.get(c.product_id) ?? 0) + c.qty * req.qty);
        }
        orderNotes.push(
          `Ordered as bundle: ${b.name}${req.qty > 1 ? ` ×${req.qty}` : ""}${
            b.discount > 0 ? ` (₱${(b.discount * req.qty).toLocaleString()} off)` : ""
          }`
        );
      }
      // The bundle's products must actually be on the order to earn its discount.
      for (const [productId, need] of required) {
        const have = items
          .filter((it) => it.product_id === productId)
          .reduce((s, it) => s + (Number(it.qty) || 0), 0);
        if (have < need) {
          return NextResponse.json(
            { error: "The bundles in your cart have changed — please review your cart and try again." },
            { status: 400 }
          );
        }
      }
    }

    // Bundle-only products can't be ordered on their own: every unit must come
    // from a bundle on this order.
    if (orderedIds.length > 0) {
      const { data: bundleOnly } = await supabase
        .from("products")
        .select("id, name")
        .in("id", orderedIds)
        .eq("bundle_only", true);
      for (const p of bundleOnly ?? []) {
        const have = items
          .filter((it) => it.product_id === p.id)
          .reduce((s, it) => s + (Number(it.qty) || 0), 0);
        if (have > (required.get(p.id) ?? 0)) {
          return NextResponse.json(
            { error: `"${p.name}" is only available as part of a bundle and can't be ordered on its own.` },
            { status: 400 }
          );
        }
      }
    }

    const orderTotal = bundleReqs.length > 0
      ? Math.max(0, items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0) - bundleDiscount)
      : estimatedTotal;

    // The amount the proof of payment must show, priced from the product rows
    // (not the client's totals): the down payment if one is required,
    // otherwise the full order total.
    const { data: priced } = orderedIds.length
      ? await supabase.from("products").select("id, price, sale_price").in("id", orderedIds)
      : { data: [] };
    const priceById = new Map((priced ?? []).map((p) => [p.id as string, Number(p.sale_price ?? p.price) || 0]));
    const itemsTotal = items.reduce(
      (s, it) => s + (it.product_id && priceById.has(it.product_id)
        ? priceById.get(it.product_id)! * (Number(it.qty) || 0)
        : Number(it.subtotal) || 0),
      0
    );
    const goodsValue = Math.max(0, itemsTotal - bundleDiscount);

    // Shipping fee: re-quoted from J&T here (pouch size and weight from the
    // product rows), never taken from the client. Pickup has none.
    const delivery: DeliveryMethod = delivery_method === "pickup" ? "pickup" : "jnt";
    let shippingFee: number | null = null;
    if (delivery === "jnt") {
      const provinceId = String(shipping?.province_id ?? "").trim();
      const cityId = String(shipping?.city_id ?? "").trim();
      try {
        if (!provinceId || !cityId) throw new Error("no province/city id");
        const quote = await quoteShipping({ items, provinceId, cityId, goodsValue });
        shippingFee = quote.fee;
        orderNotes.push(
          `Shipping: J&T Express ₱${quote.fee.toLocaleString()} (${quote.pouch ? `${POUCH_LABEL[quote.pouch]} pouch` : `${quote.weight || 1} kg`}${
            quote.valuationFee > 0 ? `, incl. ₱${quote.valuationFee.toLocaleString()} valuation fee` : ""
          }).`
        );
      } catch (err) {
        console.error("[pre-order] J&T quote failed:", err);
        orderNotes.push("Shipping: J&T Express — rate unavailable at checkout, shipping fee TBA.");
      }
    }
    const shippingSummary: ShippingSummary = { label: DELIVERY_METHODS[delivery], fee: shippingFee };

    // A down payment covers only itself — shipping is paid with the balance.
    const expectedPayment = requiredDp > 0 ? requiredDp : goodsValue + (shippingFee ?? 0);

    // A pre-order with no down payment required has nothing to pay upfront at
    // all — the form doesn't even show a payment section — so it's never held
    // for payment, whatever (if anything) payment_proof_url turns out to be.
    const paymentNeeded = isCheckout || requiredDp > 0;

    let verification: PaymentVerification | null = null;
    let paymentNote: string | null = null;
    if (payment_proof_url) {
      const proof = await loadPaymentProof(payment_proof_url);
      if (!proof.found) {
        return NextResponse.json({ error: "Your proof of payment couldn't be found. Please upload it again." }, { status: 400 });
      }
      verification = verifyPayment(
        proof.extraction,
        expectedPayment,
        await isDuplicateReference(proof.extraction?.reference ?? null)
      );
      paymentNote = verificationNote(verification);
    } else if (paymentNeeded) {
      paymentNote = `Payment: not paid yet — pre-order placed without a proof of payment (₱${expectedPayment.toLocaleString()} due).`;
    }
    if (paymentNote) orderNotes.push(paymentNote);
    const verified = verification?.verified ?? false;

    // Verified: checkout → confirmed, pre-order → pre-order.
    // Not verified: checkout → pending, pre-order with a down payment due → hold
    // pre-order, pre-order with nothing due → pre-order straight away.
    const orderStatus = isCheckout
      ? (verified ? "confirmed" : "pending")
      : !paymentNeeded
        ? "pre-order"
        : (verified ? "pre-order" : "hold pre-order");

    const date = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Manila",
    });

    // Colors + customer-facing text from /admin/content → Email, sender/recipient from → Branding.
    const { email: emailContent, branding } = await getSiteContent();
    const fromAddress = resolveFromAddress(branding.systemEmail);

    const [sheetResult, emailResult, customerEmailResult, dbResult] = await Promise.allSettled([
      appendToSheet({ date, name, location, phone, email, items }),
      getResend().emails.send({
        from: fromAddress,
        to: resolveOrderEmail(branding.orderEmail),
        subject: isCheckout ? `New Order from ${name}` : `New Pre-Order from ${name}`,
        html: isCheckout
          ? buildCheckoutEmailHtml(name, location, phone, email, facebook?.trim() || "", payment_method || null, items, orderTotal, date, paymentNote ?? "", shippingSummary, emailContent.colors)
          : buildPreOrderEmailHtml(name, location, phone, email, facebook?.trim() || "", items, orderTotal, date, paymentNote ?? "No down payment required for this pre-order.", shippingSummary, emailContent.colors),
      }),
      getResend().emails.send({
        from: fromAddress,
        to: email,
        subject: isCheckout ? "Thanks for your order! - xzvl.store" : "Thanks for your pre-order! - xzvl.store",
        html: buildCustomerEmailHtml(isCheckout, name, items, orderTotal, date, shippingSummary, emailContent.colors, emailContent.text),
      }),
      insertOrder({
        name, email, phone, location,
        facebook: facebook?.trim() || null,
        status: orderStatus,
        notes: orderNotes,
        estimated_total: orderTotal,
        discount: bundleDiscount,
        items,
        payment_method: payment_method || null,
        delivery_method: DELIVERY_METHODS[delivery],
        shipping_fee: shippingFee,
        customer_id: customer_id || null,
        billing_address_1: billing?.address_1 || "",
        billing_address_2: billing?.address_2 || "",
        billing_city: billing?.city || "",
        billing_state: billing?.state || "",
        billing_postcode: billing?.postcode || "",
        billing_region: billing?.region || "",
        billing_phone: phone || "",
        shipping_address_1: shipping?.address_1 || "",
        shipping_address_2: shipping?.address_2 || "",
        shipping_city: shipping?.city || "",
        shipping_state: shipping?.state || "",
        shipping_postcode: shipping?.postcode || "",
        shipping_region: shipping?.region || "",
        shipping_phone: phone || "",
      }, {
        payment_reference: verification?.reference ?? null,
        payment_verification: verification,
        proof_images: payment_proof_url
          ? [{ url: payment_proof_url, type: "payment", uploaded_at: new Date().toISOString() }]
          : [],
        ...(verified && !isCheckout && requiredDp > 0 ? { down_payment: requiredDp } : {}),
        ...(verification?.verified && verification.date ? { payment_date: `${verification.date}T00:00:00+08:00` } : {}),
      }, {
        shipping_name: shipping_name?.trim() || name,
        billing_province_id: billing?.province_id || null,
        billing_city_id: billing?.city_id || null,
        shipping_province_id: shipping?.province_id || null,
        shipping_city_id: shipping?.city_id || null,
      }),
    ]);

    const errors: string[] = [];
    if (sheetResult.status === "rejected") {
      console.error("[pre-order] Sheets error:", sheetResult.reason);
      errors.push(`Sheets: ${sheetResult.reason?.message ?? sheetResult.reason}`);
    }
    if (emailResult.status === "rejected") {
      console.error("[pre-order] Resend error:", emailResult.reason);
      errors.push(`Email: ${emailResult.reason?.message ?? emailResult.reason}`);
    }
    if (customerEmailResult.status === "rejected") {
      console.error("[pre-order] Customer email error:", customerEmailResult.reason);
      errors.push(`Customer email: ${customerEmailResult.reason?.message ?? customerEmailResult.reason}`);
    }
    if (dbResult.status === "rejected") {
      console.error("[pre-order] Supabase error:", dbResult.reason);
      errors.push(`DB: ${dbResult.reason?.message ?? dbResult.reason}`);
    }

    if (errors.length) {
      // Still return 200 so the user sees the success screen,
      // but include debug info visible in Vercel Function logs.
      console.error("[pre-order] Integration errors:", errors);
    }

    // Reduce stock for each item
    if (dbResult.status === "fulfilled") {
      await adjustStock(
        items.map((it) => ({ product_id: it.product_id ?? null, qty: it.qty })),
        -1
      );
    }

    // Keep the customer's saved Facebook link in sync with what they submitted.
    if (customer_id && facebook?.trim()) {
      const { error: syncError } = await supabase
        .from("customers")
        .update({ facebook_url: facebook.trim() })
        .eq("id", customer_id);
      if (syncError) console.error("[pre-order] Customer facebook sync error:", syncError);
    }

    return NextResponse.json(
      { success: true, errors, status: orderStatus, verified, flags: verification?.flags ?? [] },
      { status: 200 }
    );
  } catch (err) {
    console.error("Pre-order error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
