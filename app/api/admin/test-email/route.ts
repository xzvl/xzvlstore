import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { NORMALIZERS } from "@/lib/site-content";
import { buildCustomerEmailHtml, resolveFromAddress } from "@/lib/email-templates";
import { getSiteContent } from "@/lib/get-site-content";

// "Send Test Email" button in /admin/content → Email. Sends the customer-facing
// "Thank You" email (the one that uses both the colors and the text fields) with
// sample order data, built from whatever's currently in the form — including
// unsaved edits — so the admin can check a change before saving it.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 500 });
  }

  // The draft from the form may have an invalid hex value mid-edit — normalize
  // it the same way a save would, rather than rejecting it.
  const content = NORMALIZERS.email(body?.content);

  const sampleItems = [
    { product: "CX-13 Bahamut Blitz BK1-50I", qty: 1, subtotal: 999 },
    { product: "G1682 Fort Hornet R7-60T", qty: 2, subtotal: 2398 },
  ];
  const sampleTotal = sampleItems.reduce((s, i) => s + i.subtotal, 0);
  const sampleDate = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila",
  });

  const html = buildCustomerEmailHtml(
    true,
    "Juan Dela Cruz",
    sampleItems,
    sampleTotal,
    sampleDate,
    { label: "J&T Express", fee: 120 },
    content.colors,
    content.text
  );

  try {
    const { branding } = await getSiteContent();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: resolveFromAddress(branding.systemEmail),
      to,
      subject: "[Test] Thanks for your order! - xzvl.store",
      html,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send test email." },
      { status: 500 }
    );
  }
}
