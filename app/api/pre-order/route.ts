import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { adjustStock } from "@/lib/stock";
import { getPurchasedQtyMap, PURCHASE_LIMIT_WINDOW_DAYS } from "@/lib/purchase-limit";

const getResend = () => new Resend(process.env.RESEND_API_KEY);

type OrderItem = { product_id?: string; product: string; qty: number; unit_price?: number; subtotal: number };

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

// ─── Email ────────────────────────────────────────────────────────────────────

function orderItemsRows(items: OrderItem[]) {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #2a2a2a;font-size:13px;">${item.product}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #2a2a2a;font-size:13px;text-align:center;">${item.qty}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #2a2a2a;font-size:13px;text-align:right;">&#8369;${item.subtotal.toLocaleString()}</td>
      </tr>`
    )
    .join("");
}

function buildPreOrderEmailHtml(
  name: string,
  location: string,
  phone: string,
  email: string,
  items: OrderItem[],
  estimatedTotal: number,
  date: string
) {
  const rows = orderItemsRows(items);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0e0e0e;">
  <div style="background:#131313;color:#e2e2e2;font-family:'Courier New',monospace;padding:40px 32px;max-width:600px;margin:0 auto;border:1px solid #1f1f1f;">

    <p style="color:#ed0d11;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">XZVL_STORE // NEW_PRE_ORDER</p>
    <h1 style="font-size:26px;font-weight:900;text-transform:uppercase;margin:0 0 6px 0;color:#e2e2e2;letter-spacing:-0.02em;">New Pre-Order</h1>
    <p style="font-size:12px;color:#ebbbb4;opacity:0.5;margin:0 0 28px 0;">Submitted on ${date}</p>

    <div style="background:#1a1a1a;border:1px solid #603e39;padding:18px;margin-bottom:16px;">
      <p style="font-size:10px;color:#ed0d11;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 14px 0;">Customer Info</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:5px 0;color:#ebbbb4;width:90px;">Name</td><td style="padding:5px 0;">${name}</td></tr>
        <tr><td style="padding:5px 0;color:#ebbbb4;">Location</td><td style="padding:5px 0;">${location}</td></tr>
        <tr><td style="padding:5px 0;color:#ebbbb4;">Phone</td><td style="padding:5px 0;">${phone || "—"}</td></tr>
        <tr><td style="padding:5px 0;color:#ebbbb4;">Email</td><td style="padding:5px 0;">${email || "—"}</td></tr>
      </table>
    </div>

    <div style="background:#1a1a1a;border:1px solid #603e39;padding:18px;margin-bottom:16px;">
      <p style="font-size:10px;color:#ed0d11;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 14px 0;">Order Items</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #603e39;">
            <th style="padding:8px 14px;text-align:left;color:#ebbbb4;font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Product</th>
            <th style="padding:8px 14px;text-align:center;color:#ebbbb4;font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Qty</th>
            <th style="padding:8px 14px;text-align:right;color:#ebbbb4;font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="border:1px solid #603e39;padding:18px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td>
            <p style="font-size:10px;color:#ebbbb4;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px 0;">Estimated Total</p>
            <p style="font-size:24px;font-weight:900;color:#ed0d11;margin:0;">&#8369;${estimatedTotal.toLocaleString()}</p>
            <p style="font-size:10px;color:#ebbbb4;opacity:0.5;margin:4px 0 0 0;">Shipping fee not yet included</p>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <p style="font-size:10px;color:#ebbbb4;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px 0;">Shipping Fee</p>
            <p style="font-size:14px;font-style:italic;color:#ebbbb4;margin:0;">TBA</p>
          </td>
        </tr>
      </table>
    </div>

  </div>
</body>
</html>`;
}

function buildCustomerEmailHtml(
  isCheckout: boolean,
  name: string,
  items: OrderItem[],
  estimatedTotal: number,
  date: string
) {
  const rows = orderItemsRows(items);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xzvl.store";
  const ordersUrl = `${siteUrl}/account?tab=orders`;
  const firstName = name.split(" ")[0] || name;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0e0e0e;">
  <div style="background:#131313;color:#e2e2e2;font-family:'Courier New',monospace;padding:40px 32px;max-width:600px;margin:0 auto;border:1px solid #1f1f1f;">

    <p style="color:#ed0d11;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">XZVL_STORE</p>
    <h1 style="font-size:26px;font-weight:900;text-transform:uppercase;margin:0 0 6px 0;color:#e2e2e2;letter-spacing:-0.02em;">Thank You, ${firstName}!</h1>
    <p style="font-size:13px;color:#ebbbb4;opacity:0.7;margin:0 0 28px 0;line-height:1.6;">
      ${
        isCheckout
          ? "We've received your order and we're getting it ready. We'll notify you once it ships."
          : "We've received your pre-order request. We'll reach out once your item is confirmed and ready."
      }
    </p>

    <div style="background:#1a1a1a;border:1px solid #603e39;padding:18px;margin-bottom:16px;">
      <p style="font-size:10px;color:#ed0d11;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 4px 0;">
        ${isCheckout ? "Order" : "Pre-Order"} Summary
      </p>
      <p style="font-size:11px;color:#ebbbb4;opacity:0.5;margin:0 0 14px 0;">Placed on ${date}</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #603e39;">
            <th style="padding:8px 14px;text-align:left;color:#ebbbb4;font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Product</th>
            <th style="padding:8px 14px;text-align:center;color:#ebbbb4;font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Qty</th>
            <th style="padding:8px 14px;text-align:right;color:#ebbbb4;font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="border:1px solid #603e39;padding:18px;margin-bottom:28px;">
      <p style="font-size:10px;color:#ebbbb4;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px 0;">
        ${isCheckout ? "Order Total" : "Estimated Total"}
      </p>
      <p style="font-size:24px;font-weight:900;color:#ed0d11;margin:0;">&#8369;${estimatedTotal.toLocaleString()}</p>
      <p style="font-size:10px;color:#ebbbb4;opacity:0.5;margin:4px 0 0 0;">Shipping fee not yet included</p>
    </div>

    <div style="text-align:center;margin-bottom:8px;">
      <a href="${ordersUrl}" style="display:inline-block;background:#ed0d11;color:#ffffff;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:14px 28px;">
        View My Orders
      </a>
    </div>
    <p style="text-align:center;font-size:10px;color:#ebbbb4;opacity:0.4;margin:0;">
      Track this ${isCheckout ? "order" : "pre-order"} anytime from your account page.
    </p>

  </div>
</body>
</html>`;
}

function buildCheckoutEmailHtml(
  name: string,
  location: string,
  phone: string,
  email: string,
  paymentMethod: string | null,
  items: OrderItem[],
  estimatedTotal: number,
  date: string
) {
  const rows = orderItemsRows(items);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0e0e0e;">
  <div style="background:#131313;color:#e2e2e2;font-family:'Courier New',monospace;padding:40px 32px;max-width:600px;margin:0 auto;border:1px solid #1f1f1f;">

    <p style="color:#ed0d11;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">XZVL_STORE // NEW_ORDER</p>
    <h1 style="font-size:26px;font-weight:900;text-transform:uppercase;margin:0 0 6px 0;color:#e2e2e2;letter-spacing:-0.02em;">New Order</h1>
    <p style="font-size:12px;color:#ebbbb4;opacity:0.5;margin:0 0 28px 0;">Placed on ${date}</p>

    <div style="background:#1a1a1a;border:1px solid #603e39;padding:18px;margin-bottom:16px;">
      <p style="font-size:10px;color:#ed0d11;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 14px 0;">Customer Info</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:5px 0;color:#ebbbb4;width:110px;">Name</td><td style="padding:5px 0;">${name}</td></tr>
        <tr><td style="padding:5px 0;color:#ebbbb4;">Location</td><td style="padding:5px 0;">${location}</td></tr>
        <tr><td style="padding:5px 0;color:#ebbbb4;">Phone</td><td style="padding:5px 0;">${phone || "—"}</td></tr>
        <tr><td style="padding:5px 0;color:#ebbbb4;">Email</td><td style="padding:5px 0;">${email || "—"}</td></tr>
        <tr><td style="padding:5px 0;color:#ebbbb4;">Payment Method</td><td style="padding:5px 0;">${paymentMethod || "—"}</td></tr>
      </table>
    </div>

    <div style="background:#1a1a1a;border:1px solid #603e39;padding:18px;margin-bottom:16px;">
      <p style="font-size:10px;color:#ed0d11;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 14px 0;">Order Items</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #603e39;">
            <th style="padding:8px 14px;text-align:left;color:#ebbbb4;font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Product</th>
            <th style="padding:8px 14px;text-align:center;color:#ebbbb4;font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Qty</th>
            <th style="padding:8px 14px;text-align:right;color:#ebbbb4;font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="border:1px solid #603e39;padding:18px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td>
            <p style="font-size:10px;color:#ebbbb4;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px 0;">Order Total</p>
            <p style="font-size:24px;font-weight:900;color:#ed0d11;margin:0;">&#8369;${estimatedTotal.toLocaleString()}</p>
            <p style="font-size:10px;color:#ebbbb4;opacity:0.5;margin:4px 0 0 0;">Shipping fee not yet included</p>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <p style="font-size:10px;color:#ebbbb4;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px 0;">Shipping Fee</p>
            <p style="font-size:14px;font-style:italic;color:#ebbbb4;margin:0;">TBA</p>
          </td>
        </tr>
      </table>
    </div>

  </div>
</body>
</html>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, location, phone, email, items, estimatedTotal, payment_method, status, customer_id, billing, shipping, order_type } = body as {
      name: string;
      location: string;
      phone: string;
      email: string;
      items: OrderItem[];
      estimatedTotal: number;
      payment_method?: string;
      status?: string;
      customer_id?: string;
      billing?: { address_1: string; address_2: string; city: string; state: string; postcode: string; region: string };
      shipping?: { address_1: string; address_2: string; city: string; state: string; postcode: string; region: string };
      order_type?: "checkout" | "pre-order";
    };

    const isCheckout = order_type === "checkout";

    if (!name || !location || !phone || !email || !items?.length) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
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

    const date = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Manila",
    });

    const [sheetResult, emailResult, customerEmailResult, dbResult] = await Promise.allSettled([
      appendToSheet({ date, name, location, phone, email, items }),
      getResend().emails.send({
        from: process.env.RESEND_FROM ?? "xzvl.store <onboarding@resend.dev>",
        to: "xzviel@gmail.com",
        subject: isCheckout ? `New Order from ${name}` : `New Pre-Order from ${name}`,
        html: isCheckout
          ? buildCheckoutEmailHtml(name, location, phone, email, payment_method || null, items, estimatedTotal, date)
          : buildPreOrderEmailHtml(name, location, phone, email, items, estimatedTotal, date),
      }),
      getResend().emails.send({
        from: process.env.RESEND_FROM ?? "xzvl.store <onboarding@resend.dev>",
        to: email,
        subject: isCheckout ? "Thanks for your order! - xzvl.store" : "Thanks for your pre-order! - xzvl.store",
        html: buildCustomerEmailHtml(isCheckout, name, items, estimatedTotal, date),
      }),
      supabase.from("orders").insert({
        name, email, phone, location,
        status: status || "pre-order",
        estimated_total: estimatedTotal,
        items,
        payment_method: payment_method || null,
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

    return NextResponse.json({ success: true, errors }, { status: 200 });
  } catch (err) {
    console.error("Pre-order error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
