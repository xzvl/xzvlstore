import { revalidatePath } from "next/cache";

// Marks every storefront page (home, collections, product pages…) stale so the
// next visit re-renders with fresh Supabase data. On Vercel this also purges the
// CDN copy of those pages. Called after admin edits and by the manual
// "Clear Cache" button in /admin/content.
export function revalidateStorefront() {
  revalidatePath("/", "layout");
}
