import os from "os";
import { supabase } from "@/lib/supabase";
import { parsePaymentText, type PaymentExtraction } from "@/lib/payment-proof";

// Server-only: reads payment screenshots with Tesseract.js and keeps them in
// Storage. Each upload is stored as payment-proofs/<id>.webp next to a
// payment-proofs/<id>.json holding what OCR read, so the order route can
// verify it later without re-running OCR. Only the server writes these files,
// so the customer can't hand in their own "verified" result.

const BUCKET = "product-images";
const FOLDER = "payment-proofs";
// Well under the routes' 60s maxDuration, leaving room to store the image.
const OCR_TIMEOUT_MS = 30_000;

/** Runs OCR on an image and parses the payment details. null if OCR failed. */
export async function readPaymentProof(image: Buffer): Promise<PaymentExtraction | null> {
  try {
    // Grayscale + upscale + normalize makes small screenshot text much easier
    // for Tesseract to read.
    let input = image;
    try {
      const sharp = (await import("sharp")).default;
      input = await sharp(image)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: false })
        .grayscale()
        .normalize()
        .png()
        .toBuffer();
    } catch {
      // Use the original bytes if sharp can't process the image.
    }

    const { createWorker } = await import("tesseract.js");
    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    const run = async () => {
      // The English language data is downloaded once and cached in the temp
      // dir (the deploy filesystem is read-only).
      worker = await createWorker("eng", undefined, { cachePath: os.tmpdir() });
      const { data } = await worker.recognize(input);
      return parsePaymentText(data.text ?? "");
    };
    // If the worker stalls, give up so the upload still goes through and the
    // payment is checked manually instead of the request timing out.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`OCR timed out after ${OCR_TIMEOUT_MS / 1000}s`)), OCR_TIMEOUT_MS);
    });
    try {
      return await Promise.race([run(), timeout]);
    } finally {
      clearTimeout(timer);
      await (worker as Awaited<ReturnType<typeof createWorker>> | null)?.terminate().catch(() => {});
    }
  } catch (err) {
    console.error("[payment-proof] OCR error:", err);
    return null;
  }
}

/** Stores the screenshot (as WebP when possible) plus its OCR result. */
export async function storePaymentProof(
  image: Buffer,
  mime: string,
  extraction: PaymentExtraction | null
): Promise<string> {
  let buffer = image;
  let ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "png";
  let contentType = mime;
  try {
    const sharp = (await import("sharp")).default;
    buffer = await sharp(image).rotate().webp({ quality: 85 }).toBuffer();
    ext = "webp";
    contentType = "image/webp";
  } catch {
    // Keep the original if conversion fails.
  }

  const base = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(`${base}.${ext}`, buffer, { contentType, upsert: false });
  if (error) throw new Error(error.message);

  await supabase.storage
    .from(BUCKET)
    .upload(`${base}.json`, JSON.stringify({ extraction }), { contentType: "application/json", upsert: false });

  return supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
}

/** Storage path of a payment proof from its public URL, or null if it isn't one of ours. */
function proofPath(url: string): string | null {
  const prefix = supabase.storage.from(BUCKET).getPublicUrl(`${FOLDER}/`).data.publicUrl;
  if (typeof url !== "string" || !url.startsWith(prefix)) return null;
  const name = url.slice(prefix.length);
  return /^[\w-]+\.[a-z]+$/i.test(name) ? `${FOLDER}/${name}` : null;
}

/**
 * Loads what OCR read from a stored payment proof. Re-runs OCR if the saved
 * result is missing. `found` is false when the URL isn't a stored proof.
 */
export async function loadPaymentProof(
  url: string
): Promise<{ found: boolean; extraction: PaymentExtraction | null }> {
  const path = proofPath(url);
  if (!path) return { found: false, extraction: null };

  const { data: json } = await supabase.storage.from(BUCKET).download(path.replace(/\.[a-z]+$/i, ".json"));
  if (json) {
    try {
      const parsed = JSON.parse(await json.text());
      return { found: true, extraction: parsed.extraction ?? null };
    } catch {}
  }

  const { data: img } = await supabase.storage.from(BUCKET).download(path);
  if (!img) return { found: false, extraction: null };
  return { found: true, extraction: await readPaymentProof(Buffer.from(await img.arrayBuffer())) };
}

/** Whether another order already used this payment reference number. */
export async function isDuplicateReference(reference: string | null): Promise<boolean> {
  if (!reference) return false;
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("payment_reference", reference)
    .limit(1);
  if (error) {
    // Fail safe: if we can't check (e.g. the column isn't added yet), don't
    // let the payment auto-verify.
    console.error("[payment-proof] Duplicate check failed (is orders.payment_reference added?):", error.message);
    return true;
  }
  return (data ?? []).length > 0;
}
