import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_SITE_CONTENT, NORMALIZERS, type SiteContent } from "@/lib/site-content";

// Server-only: imports the service-role Supabase client, so never import this
// from a client component (use lib/site-content.ts for types/defaults there).
//
// Reads every row of `site_content` and merges it over the defaults, so a
// section the admin hasn't touched yet still renders with the built-in copy —
// and so does the whole site if the table doesn't exist yet. Wrapped in
// cache() so the root layout, its metadata and the page share one query per render.
export const getSiteContent = cache(async (): Promise<SiteContent> => {
  const { data } = await supabase.from("site_content").select("key, value");
  const result: SiteContent = { ...DEFAULT_SITE_CONTENT };
  for (const row of data ?? []) {
    const key = row.key as keyof SiteContent;
    if (key in NORMALIZERS) {
      // TS can't correlate the dynamic key with its matching value type.
      (result as Record<string, unknown>)[key] = NORMALIZERS[key](row.value);
    }
  }
  return result;
});
