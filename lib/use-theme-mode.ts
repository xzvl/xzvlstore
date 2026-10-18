"use client";

import { useEffect, useState } from "react";
import type { ThemeMode } from "@/lib/site-content";

/**
 * Live-reads <html data-theme> (dark/light), the storefront's actual rendered
 * mode. ThemeToggle flips that attribute directly with no event of its own, so
 * this watches it with a MutationObserver instead, letting any component (the
 * logo in Header/Footer/MaintenanceGate) react to the visitor's toggle without
 * prop-drilling. Null until mounted — the server can't know the visitor's saved
 * mode ahead of the init script in <head> (see lib/theme.ts).
 */
export function useThemeMode(): ThemeMode | null {
  const [mode, setMode] = useState<ThemeMode | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setMode(root.dataset.theme === "light" ? "light" : "dark");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return mode;
}
