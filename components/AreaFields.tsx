"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { POUCH_LABEL, type Area, type DeliveryMethod, type ShippingQuote } from "@/lib/shipping";

// ─── Data hooks ───────────────────────────────────────────────────────────────

// Shared across every picker on the page (billing + shipping ask for the same lists).
const areaCache = new Map<string, Promise<Area[]>>();

function loadAreas(parentId: string | null): Promise<Area[]> {
  const key = parentId ?? "";
  let p = areaCache.get(key);
  if (!p) {
    p = fetch(`/api/shipping/areas${parentId ? `?parentId=${encodeURIComponent(parentId)}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d) => (Array.isArray(d) ? (d as Area[]) : []));
    p.catch(() => areaCache.delete(key));
    areaCache.set(key, p);
  }
  return p;
}

/** Provinces (parentId undefined) or the cities of a province. parentId null = nothing to load yet. */
export function useAreas(parentId: string | null | undefined) {
  const enabled = parentId !== null;
  const [state, setState] = useState<{ areas: Area[]; loading: boolean; error: boolean }>({
    areas: [],
    loading: enabled,
    error: false,
  });
  useEffect(() => {
    if (parentId === null) {
      setState({ areas: [], loading: false, error: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    loadAreas(parentId ?? null)
      .then((areas) => !cancelled && setState({ areas, loading: false, error: false }))
      .catch(() => !cancelled && setState({ areas: [], loading: false, error: true }));
    return () => { cancelled = true; };
  }, [parentId]);
  return state;
}

/**
 * Live J&T Express quote for the order summary. Returns null fee while there's
 * nothing to quote (no city yet / pickup).
 */
export function useShippingQuote({
  enabled,
  provinceId,
  cityId,
  items,
  goodsValue,
}: {
  enabled: boolean;
  provinceId: string;
  cityId: string;
  items: { product_id: string; qty: number }[];
  goodsValue: number;
}) {
  const [state, setState] = useState<{ quote: ShippingQuote | null; loading: boolean; error: string }>({
    quote: null,
    loading: false,
    error: "",
  });
  const key = enabled && provinceId && cityId && items.length
    ? JSON.stringify({ provinceId, cityId, items, goodsValue })
    : "";

  useEffect(() => {
    if (!key) {
      setState({ quote: null, loading: false, error: "" });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ province_id: provinceId, city_id: cityId, items, goods_value: goodsValue }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Couldn't get a shipping rate.");
        setState({ quote: data as ShippingQuote, loading: false, error: "" });
      } catch (err) {
        if (!cancelled) setState({ quote: null, loading: false, error: err instanceof Error ? err.message : "Couldn't get a shipping rate." });
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
    // `key` captures every input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

// ─── Combobox ─────────────────────────────────────────────────────────────────

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, " ");

/** Finds the area a typed/saved name refers to (display name or J&T name). */
export const matchArea = (areas: Area[], text: string) => {
  const t = norm(text);
  return t ? areas.find((a) => norm(a.name) === t || norm(a.nativeName) === t) : undefined;
};

/** Free-text input with a filtered dropdown of J&T areas. Picking (or typing an exact name) sets the id. */
export function AreaCombobox({
  id,
  value,
  selectedId,
  areas,
  loading,
  disabled,
  placeholder,
  inputClassName,
  onChange,
}: {
  id: string;
  value: string;
  selectedId: string;
  areas: Area[];
  loading: boolean;
  disabled?: boolean;
  placeholder: string;
  inputClassName: string;
  onChange: (text: string, area: Area | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // A saved/auto-filled name gets its id once both it and the list are here,
  // whichever arrives last (the account prefill often lands after the list).
  useEffect(() => {
    if (selectedId && areas.some((a) => a.id === selectedId)) return;
    const m = matchArea(areas, value);
    if (m) onChange(m.name, m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas, value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const selected = areas.find((a) => a.id === selectedId);
    // Showing the chosen name shouldn't hide the rest of the list.
    const t = selected && selected.name === value ? "" : norm(value);
    return t ? areas.filter((a) => norm(a.name).includes(t) || norm(a.nativeName).includes(t)) : areas;
  }, [areas, value, selectedId]);

  const pick = (a: Area) => {
    onChange(a.name, a);
    setOpen(false);
  };

  useEffect(() => {
    listRef.current?.children[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  return (
    <div ref={ref} className="relative">
      <input
        id={id}
        value={value}
        disabled={disabled}
        autoComplete="off"
        placeholder={disabled ? "Select a province first" : placeholder}
        onFocus={() => { setOpen(true); setHighlight(0); }}
        onChange={(e) => {
          const text = e.target.value;
          onChange(text, matchArea(areas, text) ?? null);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && open && filtered[highlight]) { e.preventDefault(); pick(filtered[highlight]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className={`${inputClassName} pr-10 disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-accent/40">
        {loading ? "progress_activity" : selectedId ? "check" : "expand_more"}
      </span>
      {open && !disabled && (
        <ul
          ref={listRef}
          className="absolute top-full left-0 right-0 z-50 mt-px bg-panel border border-line max-h-[240px] overflow-y-auto shadow-xl shadow-black/40"
        >
          {loading ? (
            <li className="px-4 py-3 font-mono text-[11px] text-accent/40">Loading…</li>
          ) : filtered.length === 0 ? (
            <li className="px-4 py-3 font-mono text-[11px] text-accent/40">No matches.</li>
          ) : (
            filtered.map((a, i) => (
              <li key={a.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(a)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full text-left px-4 py-2.5 font-mono text-[12px] border-b border-line/20 transition-colors ${
                    a.id === selectedId ? "text-primary bg-primary/10" : i === highlight ? "bg-fg/[0.05] text-fg" : "text-fg"
                  }`}
                >
                  {a.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Province + City pair ─────────────────────────────────────────────────────

export type ProvinceCityValue = { state: string; province_id: string; city: string; city_id: string };

type ProvinceCityProps = {
  prefix: string;
  errors?: { state?: string; city?: string };
  inputClass: (err?: boolean) => string;
  labelClass: string;
  /** Show the required asterisk on both labels. */
  required?: boolean;
};

/** Province + city pickers that track the J&T ids (checkout, pre-order). */
export function ProvinceCityFields({
  value,
  onChange,
  ...rest
}: ProvinceCityProps & { value: ProvinceCityValue; onChange: (v: ProvinceCityValue) => void }) {
  const provinces = useAreas(undefined);
  const cities = useAreas(value.province_id || null);
  return <ProvinceCityInputs {...rest} value={value} onChange={onChange} provinces={provinces} cities={cities} />;
}

/**
 * Province + city pickers for forms that only store the names (account,
 * admin customers/orders). The J&T ids are worked out from the names.
 */
export function ProvinceCityNameFields({
  state,
  city,
  onChange,
  required = false,
  ...rest
}: ProvinceCityProps & { state: string; city: string; onChange: (v: { state: string; city: string }) => void }) {
  const provinces = useAreas(undefined);
  const province_id = matchArea(provinces.areas, state)?.id ?? "";
  const cities = useAreas(province_id || null);
  const city_id = matchArea(cities.areas, city)?.id ?? "";
  return (
    <ProvinceCityInputs
      {...rest}
      required={required}
      value={{ state, province_id, city, city_id }}
      onChange={(v) => onChange({ state: v.state, city: v.city })}
      provinces={provinces}
      cities={cities}
    />
  );
}

function ProvinceCityInputs({
  prefix,
  value,
  errors = {},
  onChange,
  inputClass,
  labelClass,
  required = true,
  provinces,
  cities,
}: ProvinceCityProps & {
  value: ProvinceCityValue;
  onChange: (v: ProvinceCityValue) => void;
  provinces: ReturnType<typeof useAreas>;
  cities: ReturnType<typeof useAreas>;
}) {
  // Latest value for the async auto-match callbacks.
  const latest = useRef(value);
  latest.current = value;
  const star = required && <span className="text-primary"> *</span>;

  return (
    <>
      <div>
        <label className={labelClass} htmlFor={`${prefix}-state`}>
          State / Province{star}
        </label>
        <AreaCombobox
          id={`${prefix}-state`}
          value={value.state}
          selectedId={value.province_id}
          areas={provinces.areas}
          loading={provinces.loading}
          placeholder="Search province…"
          inputClassName={inputClass(!!errors.state)}
          onChange={(text, area) => {
            const cur = latest.current;
            const provinceId = area?.id ?? "";
            // A new province drops the city id; the typed city name is kept so it
            // can re-match once that province's cities load.
            onChange(
              provinceId === cur.province_id
                ? { ...cur, state: text }
                : { ...cur, state: text, province_id: provinceId, city_id: "" }
            );
          }}
        />
        {errors.state && <p className="font-mono text-[10px] text-primary mt-1">{errors.state}</p>}
        {provinces.error && (
          <p className="font-mono text-[10px] text-orange-400 mt-1">Couldn&apos;t load the province list — type it in.</p>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor={`${prefix}-city`}>
          City / Municipality{star}
        </label>
        <AreaCombobox
          id={`${prefix}-city`}
          value={value.city}
          selectedId={value.city_id}
          areas={cities.areas}
          loading={cities.loading}
          disabled={!value.province_id && !provinces.error}
          placeholder="Search city…"
          inputClassName={inputClass(!!errors.city)}
          onChange={(text, area) => onChange({ ...latest.current, city: text, city_id: area?.id ?? "" })}
        />
        {errors.city && <p className="font-mono text-[10px] text-primary mt-1">{errors.city}</p>}
      </div>
    </>
  );
}

// ─── Shipping fee row (order summary) ─────────────────────────────────────────

export function ShippingSummaryRow({
  delivery,
  quote,
  hasCity,
}: {
  delivery: DeliveryMethod;
  quote: ReturnType<typeof useShippingQuote>;
  hasCity: boolean;
}) {
  const right =
    delivery === "pickup" ? <span className="font-mono text-[12px] text-green-400">Free (Pickup)</span>
    : quote.loading ? <span className="material-symbols-outlined animate-spin text-[14px] text-accent/40">progress_activity</span>
    : quote.quote ? <span className="font-mono text-[12px] text-fg">₱{quote.quote.fee.toLocaleString()}</span>
    : <span className="font-mono text-[11px] text-accent/40 italic">{hasCity ? "TBA" : "Select city"}</span>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] text-accent/50">
          Shipping{delivery === "jnt" && <span className="text-accent/30"> · J&amp;T</span>}
        </span>
        {right}
      </div>
      {delivery === "jnt" && quote.quote && (
        <p className="font-mono text-[10px] text-accent/40 mt-1">
          {quote.quote.pouch ? `${POUCH_LABEL[quote.quote.pouch]} pouch` : `${quote.quote.weight || 1} kg`}
          {quote.quote.valuationFee > 0 && ` · incl. ₱${quote.quote.valuationFee.toLocaleString()} valuation fee`}
        </p>
      )}
      {delivery === "jnt" && quote.error && (
        <p className="font-mono text-[10px] text-orange-400/80 mt-1">{quote.error} We&apos;ll confirm the fee with you.</p>
      )}
    </div>
  );
}
