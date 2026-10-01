import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { revalidateStorefront } from "@/lib/revalidate";

const BUCKET = "product-images";
const PREFIX = "products";
const SIZE_KEYS = ["small", "thumbnail", "medium", "large"] as const;
type SizeKey = (typeof SIZE_KEYS)[number];
const SIZE_WIDTHS: Record<SizeKey, number> = { small: 50, thumbnail: 300, medium: 600, large: 1200 };

type ImageGroup = {
  base: string;
  originalName: string | null;
  originalExt: string | null;
  sizeBytes: number;
  hasSmall: boolean;
  hasThumbnail: boolean;
  hasMedium: boolean;
  hasLarge: boolean;
  optimized: boolean;
};

const SUFFIX_RE = /^(.+?)(?:-(small|thumbnail|medium|large))?\.([a-z0-9]+)$/i;

async function listAllObjects() {
  const all: { name: string; metadata: { size?: number } | null }[] = [];
  const limit = 1000;
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(PREFIX, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if (!data || data.length < limit) break;
    offset += limit;
  }
  return all;
}

async function listImageGroups(): Promise<ImageGroup[]> {
  const objects = await listAllObjects();
  const groups = new Map<string, ImageGroup>();

  for (const obj of objects) {
    const m = obj.name.match(SUFFIX_RE);
    if (!m) continue;
    const [, base, sizeSuffix, ext] = m;
    let group = groups.get(base);
    if (!group) {
      group = {
        base,
        originalName: null,
        originalExt: null,
        sizeBytes: 0,
        hasSmall: false,
        hasThumbnail: false,
        hasMedium: false,
        hasLarge: false,
        optimized: false,
      };
      groups.set(base, group);
    }
    if (!sizeSuffix) {
      group.originalName = obj.name;
      group.originalExt = ext.toLowerCase();
      group.sizeBytes = obj.metadata?.size ?? 0;
    } else {
      const key = `has${sizeSuffix[0].toUpperCase()}${sizeSuffix.slice(1)}` as
        | "hasSmall" | "hasThumbnail" | "hasMedium" | "hasLarge";
      group[key] = true;
    }
  }

  for (const group of groups.values()) {
    group.optimized =
      group.originalExt === "webp" &&
      group.hasSmall && group.hasThumbnail && group.hasMedium && group.hasLarge;
  }

  return Array.from(groups.values()).sort((a, b) => b.base.localeCompare(a.base));
}

export async function GET() {
  try {
    const groups = await listImageGroups();
    const rows = groups.map((g) => ({
      ...g,
      originalUrl: g.originalName
        ? supabase.storage.from(BUCKET).getPublicUrl(`${PREFIX}/${g.originalName}`).data.publicUrl
        : null,
    }));
    return NextResponse.json({ rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list images." },
      { status: 500 }
    );
  }
}

// ─── Optimize ───────────────────────────────────────────────────────────────

type ProductRow = {
  id: string;
  image: string | null;
  main_image: string | null;
  gallery_images: string[] | null;
  social_image: string | null;
};

type SiteContentRow = { key: string; value: Record<string, unknown> };

function publicUrl(name: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(`${PREFIX}/${name}`).data.publicUrl;
}

/** Replaces every occurrence of oldUrl with newUrl across the in-memory working set. Returns whether anything changed. */
function rewriteReferences(
  oldUrl: string,
  newUrl: string,
  products: ProductRow[],
  changedProductIds: Set<string>,
  siteContentRows: SiteContentRow[],
  changedSiteContentKeys: Set<string>
) {
  for (const p of products) {
    let changed = false;
    if (p.image === oldUrl) { p.image = newUrl; changed = true; }
    if (p.main_image === oldUrl) { p.main_image = newUrl; changed = true; }
    if (p.social_image === oldUrl) { p.social_image = newUrl; changed = true; }
    if (p.gallery_images?.includes(oldUrl)) {
      p.gallery_images = p.gallery_images.map((u) => (u === oldUrl ? newUrl : u));
      changed = true;
    }
    if (changed) changedProductIds.add(p.id);
  }

  for (const row of siteContentRows) {
    let changed = false;
    if (row.key === "hero" && Array.isArray(row.value.slides)) {
      for (const slide of row.value.slides as Record<string, unknown>[]) {
        if (slide.image === oldUrl) { slide.image = newUrl; changed = true; }
        if (slide.background === oldUrl) { slide.background = newUrl; changed = true; }
      }
    }
    if (row.key === "branding") {
      if (row.value.logoImageUrl === oldUrl) { row.value.logoImageUrl = newUrl; changed = true; }
      if (row.value.faviconUrl === oldUrl) { row.value.faviconUrl = newUrl; changed = true; }
    }
    if (changed) changedSiteContentKeys.add(row.key);
  }
}

async function processWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bases: string[] = Array.isArray(body.bases) ? body.bases : [];
    const deleteOriginals = Boolean(body.deleteOriginals);
    if (bases.length === 0) {
      return NextResponse.json({ error: "No images selected." }, { status: 400 });
    }

    const groups = await listImageGroups();
    const groupByBase = new Map(groups.map((g) => [g.base, g]));

    const [{ data: productRows }, { data: siteContentRowsRaw }] = await Promise.all([
      supabase.from("products").select("id, image, main_image, gallery_images, social_image"),
      supabase.from("site_content").select("key, value").in("key", ["hero", "branding"]),
    ]);
    const products = (productRows ?? []) as ProductRow[];
    const siteContentRows = (siteContentRowsRaw ?? []) as SiteContentRow[];
    const changedProductIds = new Set<string>();
    const changedSiteContentKeys = new Set<string>();

    const sharp = (await import("sharp")).default;

    const results: { base: string; status: "optimized" | "skipped" | "error"; message?: string }[] = [];

    await processWithConcurrency(bases, 3, async (base) => {
      const group = groupByBase.get(base);
      if (!group || !group.originalName) {
        results.push({ base, status: "error", message: "Original file not found." });
        return;
      }
      if (group.optimized) {
        results.push({ base, status: "skipped" });
        return;
      }

      try {
        const { data: blob, error: downloadError } = await supabase.storage
          .from(BUCKET)
          .download(`${PREFIX}/${group.originalName}`);
        if (downloadError || !blob) throw new Error(downloadError?.message ?? "Download failed.");
        const rawBuffer = Buffer.from(await blob.arrayBuffer());

        let newOriginalName = group.originalName;
        if (group.originalExt !== "webp") {
          const webpBuffer = await sharp(rawBuffer).webp({ quality: 82 }).toBuffer();
          newOriginalName = `${base}.webp`;
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(`${PREFIX}/${newOriginalName}`, webpBuffer, { contentType: "image/webp", upsert: false });
          if (uploadError) throw new Error(uploadError.message);

          const oldUrl = publicUrl(group.originalName);
          const newUrl = publicUrl(newOriginalName);
          rewriteReferences(oldUrl, newUrl, products, changedProductIds, siteContentRows, changedSiteContentKeys);

          if (deleteOriginals) {
            await supabase.storage.from(BUCKET).remove([`${PREFIX}/${group.originalName}`]);
          }
        }

        const missingSizes = SIZE_KEYS.filter((key) => !group[`has${key[0].toUpperCase()}${key.slice(1)}` as keyof ImageGroup]);
        for (const key of missingSizes) {
          const resized = await sharp(rawBuffer)
            .resize({ width: SIZE_WIDTHS[key], withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();
          const { error: sizeError } = await supabase.storage
            .from(BUCKET)
            .upload(`${PREFIX}/${base}-${key}.webp`, resized, { contentType: "image/webp", upsert: false });
          if (sizeError) throw new Error(sizeError.message);
        }

        results.push({ base, status: "optimized" });
      } catch (err) {
        results.push({ base, status: "error", message: err instanceof Error ? err.message : "Failed." });
      }
    });

    await Promise.all([
      ...Array.from(changedProductIds).map((id) => {
        const p = products.find((pr) => pr.id === id)!;
        return supabase
          .from("products")
          .update({
            image: p.image,
            main_image: p.main_image,
            gallery_images: p.gallery_images,
            social_image: p.social_image,
          })
          .eq("id", id);
      }),
      ...Array.from(changedSiteContentKeys).map((key) => {
        const row = siteContentRows.find((r) => r.key === key)!;
        return supabase
          .from("site_content")
          .update({ value: row.value, updated_at: new Date().toISOString() })
          .eq("key", key);
      }),
    ]);

    revalidateStorefront();
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Optimization failed unexpectedly." },
      { status: 500 }
    );
  }
}
