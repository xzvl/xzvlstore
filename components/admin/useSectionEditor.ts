"use client";

import { useState } from "react";

// Shared local-edit + save-to-API pattern for each /admin/content tab. Each tab
// owns one section of site_content (keyed by `sectionKey`); saving PUTs the
// whole section value and reports success back up via onSaved so the parent
// page's in-memory copy stays in sync without a re-fetch.
export function useSectionEditor<T>(sectionKey: string, initial: T, onSaved: (v: T) => void) {
  const [value, setValue] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const set = <K extends keyof T>(key: K, v: T[K]) => setValue((prev) => ({ ...prev, [key]: v }));

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/site-content/${sectionKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to save.");
      }
      onSaved(value);
      setMessage("Saved. Storefront cache refreshed.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return { value, set, setValue, saving, message, error, save };
}
