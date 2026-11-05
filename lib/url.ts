/** Prefixes https:// to a link typed without a protocol (e.g. "facebook.com/user"). */
export function withHttps(url: string): string;
export function withHttps(url: string | null | undefined): string | null;
export function withHttps(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}
