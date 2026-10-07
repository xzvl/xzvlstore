"use client";

import { useEffect, useState } from "react";
import type { ThemeMode } from "@/lib/site-content";
import { THEME_STORAGE_KEY } from "@/lib/theme";

// Flips <html data-theme> between the two palettes from /admin/content → Colors
// and remembers the choice (read back by the init script in the root layout).
export default function ThemeToggle({ className = "" }: { className?: string }) {
  // null until mounted: the server can't know the visitor's saved mode.
  const [mode, setMode] = useState<ThemeMode | null>(null);

  useEffect(() => {
    setMode(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: ThemeMode = mode === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    setMode(next);
  }

  const label = mode === "light" ? "Switch to dark mode" : "Switch to light mode";

  return (
    <button type="button" onClick={toggle} className={className} aria-label={label} title={label}>
      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
        {mode === "light" ? "dark_mode" : "light_mode"}
      </span>
    </button>
  );
}
