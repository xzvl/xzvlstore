import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { getSiteContent } from "@/lib/get-site-content";
import { buildWaitlistEmailHtml, resolveFromAddress } from "@/lib/email-templates";

// "Back in stock" emails for the waitlist (/account/waitlist). Called from the
// admin product PATCH route when a product goes from unavailable to available,
// and only when /admin/content → Email → Waitlist Emails is switched on.
// Waitlist rows are kept — the customer removes them — and since this only
// fires on the transition, re-saving an in-stock product doesn't re-send.

type AvailabilityFields = { status: string; sneak_peek: boolean | null; pre_order: boolean | null; stock: number | null };

/** Whether a customer can buy (or pre-order) the product right now. */
export const isAvailable = (p: AvailabilityFields) =>
  p.status === "active" && !p.sneak_peek && (!!p.pre_order || (p.stock ?? 0) > 0);

// Resend's batch endpoint takes up to 100 emails per call.
const BATCH_SIZE = 100;

export async function notifyWaitlist(product: {
  id: string;
  name: string;
  slug: string | null;
  main_image: string | null;
  image: string | null;
  pre_order: boolean | null;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const { email: emailContent, branding } = await getSiteContent();
  if (!emailContent.waitlistEnabled) return;

  const { data: rows, error } = await supabase.from("waitlist").select("customer_id").eq("product_id", product.id);
  if (error) {
    console.error("[waitlist] Failed to load waitlist:", error.message);
    return;
  }
  if (!rows?.length) return;

  const { data: customers } = await supabase
    .from("customers")
    .select("email, first_name, last_name")
    .in("id", rows.map((r) => r.customer_id));
  const recipients = (customers ?? []).filter((c) => c.email);
  if (!recipients.length) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xzvl.store";
  const productUrl = product.slug ? `${siteUrl}/product/${product.slug}` : siteUrl;
  const image = product.main_image || product.image || null;
  const from = resolveFromAddress(branding.systemEmail);
  const subject = product.pre_order ? `Now open for pre-order: ${product.name}` : `Back in stock: ${product.name}`;

  const emails = recipients.map((c) => ({
    from,
    to: c.email as string,
    subject,
    html: buildWaitlistEmailHtml(
      `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
      product.name,
      productUrl,
      image,
      !!product.pre_order,
      emailContent.colors,
      emailContent.text
    ),
  }));

  const resend = new Resend(process.env.RESEND_API_KEY);
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const { error: sendError } = await resend.batch.send(emails.slice(i, i + BATCH_SIZE));
    if (sendError) console.error("[waitlist] Resend error:", sendError.message);
  }
}
