import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const BUCKET = "product-images";
const CONVERT_TO_WEBP = new Set(["png", "jpg", "jpeg"]);
const CONVERT_MIME_TO_WEBP = new Set(["image/png", "image/jpeg"]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    let ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    let contentType = file.type;
    let buffer = Buffer.from(await file.arrayBuffer());

    if (CONVERT_TO_WEBP.has(ext) || CONVERT_MIME_TO_WEBP.has(file.type)) {
      try {
        const sharp = (await import("sharp")).default;
        buffer = await sharp(buffer).webp({ quality: 82 }).toBuffer();
        ext = "webp";
        contentType = "image/webp";
      } catch {
        // Conversion failed or unavailable (e.g. corrupt file, missing native
        // binding) — fall back to uploading the original, untouched.
      }
    }

    const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType, upsert: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed unexpectedly." },
      { status: 500 }
    );
  }
}
