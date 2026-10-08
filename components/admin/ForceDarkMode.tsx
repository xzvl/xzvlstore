"use client";

import { useEffect } from "react";

// Keeps <html data-theme="dark"> while the admin panel is mounted, so the page
// background, scrollbars and native controls match the admin's dark palette
// even after a client-side navigation from a storefront page in light mode.
// The theme init script (lib/theme.ts) does the same on a full page load.
// Restores the previous mode when leaving the admin.
export default function ForceDarkMode() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = "dark";
    return () => {
      if (previous) root.dataset.theme = previous;
    };
  }, []);
  return null;
}
