"use client";

import type { ImageLoaderProps } from "next/image";

/**
 * Custom next/image loader.
 *
 * Bypasses Vercel's `/_next/image` optimizer (which returns
 * OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED once the plan's image
 * optimization quota is exhausted).
 *
 * For Supabase Storage URLs we rewrite the public object path to the
 * image transformation endpoint so we still get width-based resizing.
 * Supabase applies `format=origin`-free auto WebP and CDN caching.
 * NOTE: Supabase image transformations require a Pro plan. On the free
 * plan the render endpoint returns 400, so this defaults to `false` and
 * the loader serves the original (already-WebP) file untouched. Flip to
 * `true` once you're on Supabase Pro to get width-based resizing.
 */
const SUPABASE_IMAGE_TRANSFORM = false;

const PUBLIC_OBJECT_SEGMENT = "/storage/v1/object/public/";
const RENDER_IMAGE_SEGMENT = "/storage/v1/render/image/public/";

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Local/relative assets (e.g. /public) — serve as-is.
  if (src.startsWith("/")) return src;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  const isSupabaseStorage =
    (url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.in")) &&
    url.pathname.includes(PUBLIC_OBJECT_SEGMENT);

  if (isSupabaseStorage && SUPABASE_IMAGE_TRANSFORM) {
    url.pathname = url.pathname.replace(PUBLIC_OBJECT_SEGMENT, RENDER_IMAGE_SEGMENT);
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(quality ?? 75));
    url.searchParams.set("resize", "contain");
    return url.toString();
  }

  // Fallback: original file, no optimization, no Vercel involvement.
  return src;
}
