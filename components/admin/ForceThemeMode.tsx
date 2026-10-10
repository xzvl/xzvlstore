"use client";

import { useEffect } from "react";
import type { ThemeMode } from "@/lib/site-content";

// Keeps <html data-theme> on the default mode from /admin/content → Colors while
// /admin or /account is mounted, so the page background, scrollbars and native
// controls match the ERP palette (.erp-theme) even after a client-side
// navigation from a storefront page in the other mode. The theme init script
// (lib/theme.ts) leaves the server-rendered default alone on a full page load.
// Restores the previous mode when leaving.
export default function ForceThemeMode({ mode }: { mode: ThemeMode }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = mode;
    return () => {
      if (previous) root.dataset.theme = previous;
    };
  }, [mode]);
  return null;
}
