import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, location, phone, email, items, estimatedTotal } = body;

    if (!name || !location || (!phone && !email) || !items?.length) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // TODO: connect to your webhook, email service, or database here
    // Example: await sendToWebhook(body)
    // Example: await sendEmail({ to: email, subject: "Pre-order confirmed", ... })

    console.log("New pre-order:", {
      name,
      location,
      phone,
      email,
      items,
      estimatedTotal,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
