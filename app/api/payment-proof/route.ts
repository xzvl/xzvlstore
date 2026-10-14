import { NextRequest, NextResponse } from "next/server";
import { readPaymentProof, storePaymentProof, isDuplicateReference } from "@/lib/payment-proof-ocr";

// OCR can take a few seconds, more on a cold start while the language data downloads.
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

// Customer proof-of-payment upload for /checkout and /pre-order. Stores the
// screenshot, reads it with OCR and returns what was found so the customer can
// see it before placing the order. The order route re-checks it on submit.
export async function POST(req: NextRequest) {
  try {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Please upload an image (screenshot) of your payment." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 8 MB)." }, { status: 400 });
    }

    const image = Buffer.from(await file.arrayBuffer());
    const extraction = await readPaymentProof(image);
    const url = await storePaymentProof(image, file.type, extraction);
    const duplicate = await isDuplicateReference(extraction?.reference ?? null);

    return NextResponse.json({ url, extraction, duplicate });
  } catch (err) {
    console.error("[payment-proof] Upload error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
