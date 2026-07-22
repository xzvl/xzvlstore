"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Taxonomy } from "@/lib/supabase";

type CurrentParams = {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
};

export default function SearchFilters({
  categories,
  brands,
  currentParams,
}: {
  categories: Taxonomy[];
  brands: Taxonomy[];
  currentParams: CurrentParams;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const selectedCategories = currentParams.category?.split(",").filter(Boolean) ?? [];
  const selectedBrands = currentParams.brand?.split(",").filter(Boolean) ?? [];
  const minPrice = currentParams.minPrice ?? "";
  const maxPrice = currentParams.maxPrice ?? "";

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(currentParams)) {
      if (value) params.set(key, value);
    }
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleCategory(id: string) {
    const next = selectedCategories.includes(id)
      ? selectedCategories.filter((c) => c !== id)
      : [...selectedCategories, id];
    navigate({ category: next.length ? next.join(",") : null });
  }

  function toggleBrand(id: string) {
    const next = selectedBrands.includes(id)
      ? selectedBrands.filter((b) => b !== id)
      : [...selectedBrands, id];
    navigate({ brand: next.length ? next.join(",") : null });
  }

  function handlePriceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const min = (form.elements.namedItem("minPrice") as HTMLInputElement).value;
    const max = (form.elements.namedItem("maxPrice") as HTMLInputElement).value;
    navigate({ minPrice: min || null, maxPrice: max || null });
  }

  const hasActiveFilters =
    selectedCategories.length > 0 || selectedBrands.length > 0 || !!minPrice || !!maxPrice;

  return (
    <aside className="w-full lg:w-56 shrink-0 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-inter font-bold text-[13px] uppercase text-[#e2e2e2]">Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => navigate({ category: null, brand: null, minPrice: null, maxPrice: null })}
            className="font-mono text-[10px] tracking-widest uppercase text-primary hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div>
          <h3 className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#e2e2e2]/70 mb-3">
            Category
          </h3>
          <div className="flex flex-col gap-2">
            {categories.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 font-mono text-[12px] text-[#e2e2e2]/60 hover:text-[#e2e2e2] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(c.id)}
                  onChange={() => toggleCategory(c.id)}
                  style={{ accentColor: "#ed0d11" }}
                  className="w-3.5 h-3.5"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {brands.length > 0 && (
        <div>
          <h3 className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#e2e2e2]/70 mb-3">
            Brands
          </h3>
          <div className="flex flex-col gap-2">
            {brands.map((b) => (
              <label
                key={b.id}
                className="flex items-center gap-2 font-mono text-[12px] text-[#e2e2e2]/60 hover:text-[#e2e2e2] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(b.id)}
                  onChange={() => toggleBrand(b.id)}
                  style={{ accentColor: "#ed0d11" }}
                  className="w-3.5 h-3.5"
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#e2e2e2]/70 mb-3">
          Price Range
        </h3>
        <form onSubmit={handlePriceSubmit} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              name="minPrice"
              type="number"
              min={0}
              defaultValue={minPrice}
              placeholder="Min"
              className="w-full bg-[#1a1a1a] border border-[#603e39]/40 px-2 py-1.5 font-mono text-[12px] text-[#e2e2e2] outline-none focus:border-primary"
            />
            <span className="text-[#e2e2e2]/30">-</span>
            <input
              name="maxPrice"
              type="number"
              min={0}
              defaultValue={maxPrice}
              placeholder="Max"
              className="w-full bg-[#1a1a1a] border border-[#603e39]/40 px-2 py-1.5 font-mono text-[12px] text-[#e2e2e2] outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 border border-[#603e39]/50 font-mono text-[10px] tracking-widest uppercase text-[#e2e2e2]/60 hover:border-primary hover:text-primary transition-all"
          >
            Apply
          </button>
        </form>
      </div>
    </aside>
  );
}
