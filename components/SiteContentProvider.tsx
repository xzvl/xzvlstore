"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";

// The root layout reads the editable site content once on the server and hands
// it down here, so Header/Footer (used by both server and client pages) get it
// without each page passing it in — and without any client-side fetch/flash.
const SiteContentContext = createContext<SiteContent>(DEFAULT_SITE_CONTENT);

export function SiteContentProvider({ value, children }: { value: SiteContent; children: ReactNode }) {
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export const useSiteContent = () => useContext(SiteContentContext);
