export type ImageSize = "small" | "thumbnail" | "medium" | "large";

/**
 * Derives the URL of a resized sibling generated at upload time (see
 * app/api/admin/upload/route.ts) from an original image URL. Pre-existing
 * images uploaded before resized siblings existed won't have one — callers
 * should pair this with an onError fallback back to the original URL.
 */
export function sizedImageUrl(url: string | null | undefined, size: ImageSize): string | null {
  if (!url) return null;
  return url.replace(/\.[a-z0-9]+$/i, `-${size}.webp`);
}
