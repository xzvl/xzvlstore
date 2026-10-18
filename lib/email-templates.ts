import { DELIVERY_METHODS } from "@/lib/shipping";
import type { EmailColors, EmailTextContent } from "@/lib/site-content";

// Shared by app/api/pre-order/route.ts (the real order/pre-order emails) and
// app/api/admin/test-email/route.ts (the "Send Test Email" button in
// /admin/content → Email), so both send exactly the same markup. Colors and
// the customer-facing greeting/button text come from /admin/content → Email —
// never hardcoded, so the admin's edits actually take effect.

export type OrderItem = { product_id?: string; product: string; qty: number; unit_price?: number; subtotal: number };

/** Shipping as shown in the emails: the fee, "Pickup", or "TBA" while unknown. */
export type ShippingSummary = { label: string; fee: number | null };

export const shippingFeeText = (sh: ShippingSummary) =>
  sh.label === DELIVERY_METHODS.pickup ? "Pickup" : sh.fee != null ? `&#8369;${sh.fee.toLocaleString()}` : "TBA";

/** The "from" header for every email this store sends — /admin/content → Branding → System Email, then the
 *  RESEND_FROM env var, then a built-in fallback. */
export const resolveFromAddress = (systemEmail: string) =>
  systemEmail ? `xzvl.store <${systemEmail}>` : process.env.RESEND_FROM ?? "xzvl.store <onboarding@resend.dev>";

/** Who receives the "New Order"/"New Pre-Order" notifications — /admin/content → Branding → Order Email, then
 *  the store owner's inbox. */
export const resolveOrderEmail = (orderEmail: string) => orderEmail || "xzviel@gmail.com";

function orderItemsRows(items: OrderItem[], colors: EmailColors) {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid ${colors.border};font-size:13px;">${item.product}</td>
        <td style="padding:10px 14px;border-bottom:1px solid ${colors.border};font-size:13px;text-align:center;">${item.qty}</td>
        <td style="padding:10px 14px;border-bottom:1px solid ${colors.border};font-size:13px;text-align:right;">&#8369;${item.subtotal.toLocaleString()}</td>
      </tr>`
    )
    .join("");
}

function paymentRow(payment: string, colors: EmailColors) {
  return `<tr><td style="padding:5px 0;color:${colors.muted};vertical-align:top;">Payment</td><td style="padding:5px 0;">${payment}</td></tr>`;
}

export function buildPreOrderEmailHtml(
  name: string,
  location: string,
  phone: string,
  email: string,
  facebook: string,
  items: OrderItem[],
  estimatedTotal: number,
  date: string,
  payment: string,
  shipping: ShippingSummary,
  colors: EmailColors
) {
  const rows = orderItemsRows(items, colors);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:${colors.background};">
  <div style="background:${colors.panel};color:${colors.text};font-family:'Courier New',monospace;padding:40px 32px;max-width:600px;margin:0 auto;border:1px solid ${colors.border};">

    <p style="color:${colors.primary};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">XZVL_STORE // NEW_PRE_ORDER</p>
    <h1 style="font-size:26px;font-weight:900;text-transform:uppercase;margin:0 0 6px 0;color:${colors.text};letter-spacing:-0.02em;">New Pre-Order</h1>
    <p style="font-size:12px;color:${colors.muted};opacity:0.5;margin:0 0 28px 0;">Submitted on ${date}</p>

    <div style="background:${colors.panelAccent};border:1px solid ${colors.border};padding:18px;margin-bottom:16px;">
      <p style="font-size:10px;color:${colors.primary};text-transform:uppercase;letter-spacing:0.15em;margin:0 0 14px 0;">Customer Info</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:5px 0;color:${colors.muted};width:90px;">Name</td><td style="padding:5px 0;">${name}</td></tr>
        <tr><td style="padding:5px 0;color:${colors.muted};">Location</td><td style="padding:5px 0;">${location}</td></tr>
        <tr><td style="padding:5px 0;color:${colors.muted};">Phone</td><td style="padding:5px 0;">${phone || "—"}</td></tr>
        <tr><td style="padding:5px 0;color:${colors.muted};">Email</td><td style="padding:5px 0;">${email || "—"}</td></tr>
        <tr><td style="padding:5px 0;color:${colors.muted};">Facebook</td><td style="padding:5px 0;">${facebook ? `<a href="${facebook}" style="color:${colors.primary};">${facebook}</a>` : "—"}</td></tr>
        ${paymentRow(payment, colors)}
      </table>
    </div>

    <div style="background:${colors.panelAccent};border:1px solid ${colors.border};padding:18px;margin-bottom:16px;">
      <p style="font-size:10px;color:${colors.primary};text-transform:uppercase;letter-spacing:0.15em;margin:0 0 14px 0;">Order Items</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid ${colors.border};">
            <th style="padding:8px 14px;text-align:left;color:${colors.muted};font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Product</th>
            <th style="padding:8px 14px;text-align:center;color:${colors.muted};font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Qty</th>
            <th style="padding:8px 14px;text-align:right;color:${colors.muted};font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="border:1px solid ${colors.border};padding:18px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td>
            <p style="font-size:10px;color:${colors.muted};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px 0;">Estimated Total</p>
            <p style="font-size:24px;font-weight:900;color:${colors.primary};margin:0;">&#8369;${(estimatedTotal + (shipping.fee ?? 0)).toLocaleString()}</p>
            <p style="font-size:10px;color:${colors.muted};opacity:0.5;margin:4px 0 0 0;">${shipping.fee == null && shipping.label !== DELIVERY_METHODS.pickup ? "Shipping fee not yet included" : "Shipping included"}</p>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <p style="font-size:10px;color:${colors.muted};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px 0;">${shipping.label}</p>
            <p style="font-size:14px;color:${colors.muted};margin:0;">${shippingFeeText(shipping)}</p>
          </td>
        </tr>
      </table>
    </div>

  </div>
</body>
</html>`;
}

export function buildCustomerEmailHtml(
  isCheckout: boolean,
  name: string,
  items: OrderItem[],
  estimatedTotal: number,
  date: string,
  shipping: ShippingSummary,
  colors: EmailColors,
  text: EmailTextContent
) {
  const rows = orderItemsRows(items, colors);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xzvl.store";
  const ordersUrl = `${siteUrl}/account/orders`;
  const firstName = name.split(" ")[0] || name;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:${colors.background};">
  <div style="background:${colors.panel};color:${colors.text};font-family:'Courier New',monospace;padding:40px 32px;max-width:600px;margin:0 auto;border:1px solid ${colors.border};">

    <p style="color:${colors.primary};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">${text.tag}</p>
    <h1 style="font-size:26px;font-weight:900;text-transform:uppercase;margin:0 0 6px 0;color:${colors.text};letter-spacing:-0.02em;">Thank You, ${firstName}!</h1>
    <p style="font-size:13px;color:${colors.muted};opacity:0.7;margin:0 0 28px 0;line-height:1.6;">
      ${isCheckout ? text.greetingCheckout : text.greetingPreOrder}
    </p>

    <div style="background:${colors.panelAccent};border:1px solid ${colors.border};padding:18px;margin-bottom:16px;">
      <p style="font-size:10px;color:${colors.primary};text-transform:uppercase;letter-spacing:0.15em;margin:0 0 4px 0;">
        ${isCheckout ? "Order" : "Pre-Order"} Summary
      </p>
      <p style="font-size:11px;color:${colors.muted};opacity:0.5;margin:0 0 14px 0;">Placed on ${date}</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid ${colors.border};">
            <th style="padding:8px 14px;text-align:left;color:${colors.muted};font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Product</th>
            <th style="padding:8px 14px;text-align:center;color:${colors.muted};font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Qty</th>
            <th style="padding:8px 14px;text-align:right;color:${colors.muted};font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="border:1px solid ${colors.border};padding:18px;margin-bottom:28px;">
      <p style="font-size:10px;color:${colors.muted};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px 0;">
        ${isCheckout ? "Order Total" : "Estimated Total"}
      </p>
      <p style="font-size:24px;font-weight:900;color:${colors.primary};margin:0;">&#8369;${(estimatedTotal + (shipping.fee ?? 0)).toLocaleString()}</p>
      <p style="font-size:10px;color:${colors.muted};opacity:0.5;margin:4px 0 0 0;">${
        shipping.label === DELIVERY_METHODS.pickup
          ? "For pickup — no shipping fee"
          : shipping.fee != null
            ? `Includes &#8369;${shipping.fee.toLocaleString()} ${shipping.label} shipping`
            : "Shipping fee not yet included"
      }</p>
    </div>

    <div style="text-align:center;margin-bottom:8px;">
      <a href="${ordersUrl}" style="display:inline-block;background:${colors.primary};color:#ffffff;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:14px 28px;">
        ${text.buttonLabel}
      </a>
    </div>
    <p style="text-align:center;font-size:10px;color:${colors.muted};opacity:0.4;margin:0;">
      Track this ${isCheckout ? "order" : "pre-order"} anytime from your account page.
    </p>

  </div>
</body>
</html>`;
}

export function buildCheckoutEmailHtml(
  name: string,
  location: string,
  phone: string,
  email: string,
  facebook: string,
  paymentMethod: string | null,
  items: OrderItem[],
  estimatedTotal: number,
  date: string,
  payment: string,
  shipping: ShippingSummary,
  colors: EmailColors
) {
  const rows = orderItemsRows(items, colors);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:${colors.background};">
  <div style="background:${colors.panel};color:${colors.text};font-family:'Courier New',monospace;padding:40px 32px;max-width:600px;margin:0 auto;border:1px solid ${colors.border};">

    <p style="color:${colors.primary};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">XZVL_STORE // NEW_ORDER</p>
    <h1 style="font-size:26px;font-weight:900;text-transform:uppercase;margin:0 0 6px 0;color:${colors.text};letter-spacing:-0.02em;">New Order</h1>
    <p style="font-size:12px;color:${colors.muted};opacity:0.5;margin:0 0 28px 0;">Placed on ${date}</p>

    <div style="background:${colors.panelAccent};border:1px solid ${colors.border};padding:18px;margin-bottom:16px;">
      <p style="font-size:10px;color:${colors.primary};text-transform:uppercase;letter-spacing:0.15em;margin:0 0 14px 0;">Customer Info</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:5px 0;color:${colors.muted};width:110px;">Name</td><td style="padding:5px 0;">${name}</td></tr>
        <tr><td style="padding:5px 0;color:${colors.muted};">Location</td><td style="padding:5px 0;">${location}</td></tr>
        <tr><td style="padding:5px 0;color:${colors.muted};">Phone</td><td style="padding:5px 0;">${phone || "—"}</td></tr>
        <tr><td style="padding:5px 0;color:${colors.muted};">Email</td><td style="padding:5px 0;">${email || "—"}</td></tr>
        <tr><td style="padding:5px 0;color:${colors.muted};">Facebook</td><td style="padding:5px 0;">${facebook ? `<a href="${facebook}" style="color:${colors.primary};">${facebook}</a>` : "—"}</td></tr>
        <tr><td style="padding:5px 0;color:${colors.muted};">Payment Method</td><td style="padding:5px 0;">${paymentMethod || "—"}</td></tr>
        ${paymentRow(payment, colors)}
      </table>
    </div>

    <div style="background:${colors.panelAccent};border:1px solid ${colors.border};padding:18px;margin-bottom:16px;">
      <p style="font-size:10px;color:${colors.primary};text-transform:uppercase;letter-spacing:0.15em;margin:0 0 14px 0;">Order Items</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid ${colors.border};">
            <th style="padding:8px 14px;text-align:left;color:${colors.muted};font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Product</th>
            <th style="padding:8px 14px;text-align:center;color:${colors.muted};font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Qty</th>
            <th style="padding:8px 14px;text-align:right;color:${colors.muted};font-size:10px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="border:1px solid ${colors.border};padding:18px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td>
            <p style="font-size:10px;color:${colors.muted};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px 0;">Order Total</p>
            <p style="font-size:24px;font-weight:900;color:${colors.primary};margin:0;">&#8369;${(estimatedTotal + (shipping.fee ?? 0)).toLocaleString()}</p>
            <p style="font-size:10px;color:${colors.muted};opacity:0.5;margin:4px 0 0 0;">${shipping.fee == null && shipping.label !== DELIVERY_METHODS.pickup ? "Shipping fee not yet included" : "Shipping included"}</p>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <p style="font-size:10px;color:${colors.muted};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px 0;">${shipping.label}</p>
            <p style="font-size:14px;color:${colors.muted};margin:0;">${shippingFeeText(shipping)}</p>
          </td>
        </tr>
      </table>
    </div>

  </div>
</body>
</html>`;
}
