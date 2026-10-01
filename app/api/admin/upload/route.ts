import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const BUCKET = "product-images";
const CONVERT_TO_WEBP = new Set(["png", "jpg", "jpeg"]);
const CONVERT_MIME_TO_WEBP = new Set(["image/png", "image/jpeg"]);

const SIZES: { key: "small" | "thumbnail" | "medium" | "large"; width: number }[] = [
  { key: "small", width: 50 },
  { key: "thumbnail", width: 300 },
  { key: "medium", width: 600 },
  { key: "large", width: 1200 },
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    let ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    let contentType = file.type;
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    let buffer = rawBuffer;

    if (CONVERT_TO_WEBP.has(ext) || CONVERT_MIME_TO_WEBP.has(file.type)) {
      try {
        const sharp = (await import("sharp")).default;
        buffer = await sharp(rawBuffer).webp({ quality: 82 }).toBuffer();
        ext = "webp";
        contentType = "image/webp";
      } catch {
        // Conversion failed or unavailable (e.g. corrupt file, missing native
        // binding) — fall back to uploading the original, untouched.
      }
    }

    const base = `products/${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const filename = `${base}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType, upsert: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

    // Resized WebP siblings (small/thumbnail/medium/large), generated from the
    // original uploaded bytes for best source quality. Best-effort: a failure
    // here never fails the upload itself, since the full-size original is
    // already safely stored and usable on its own.
    const sizes: Partial<Record<(typeof SIZES)[number]["key"], string>> = {};
    try {
      const sharp = (await import("sharp")).default;
      await Promise.all(
        SIZES.map(async ({ key, width }) => {
          try {
            const resized = await sharp(rawBuffer)
              .resize({ width, withoutEnlargement: true })
              .webp({ quality: 82 })
              .toBuffer();
            const sizedFilename = `${base}-${key}.webp`;
            const { data: sizedData, error: sizedError } = await supabase.storage
              .from(BUCKET)
              .upload(sizedFilename, resized, { contentType: "image/webp", upsert: false });
            if (sizedError) return;
            const { data: { publicUrl: sizedUrl } } = supabase.storage
              .from(BUCKET)
              .getPublicUrl(sizedData.path);
            sizes[key] = sizedUrl;
          } catch {
            // Skip this size on failure — others can still succeed.
          }
        })
      );
    } catch {
      // sharp unavailable entirely — ship the original only.
    }

    return NextResponse.json({ url: publicUrl, sizes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed unexpectedly." },
      { status: 500 }
    );
  }
}
