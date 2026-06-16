"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

type RawOrder = {
  created_at: string;
  estimated_total: number;
  discount: number;
  items: Array<{ product?: string; qty?: number; subtotal?: number }>;
};

type Performance = { totalSales: number; netSales: number; orders: number; productsSold: number };

type AnalyticsData = {
  performance: Performance;
  comparePerformance: Performance | null;
  currentOrders: RawOrder[];
  compareOrders: RawOrder[] | null;
  topBrands: Array<{ brand: string; itemsSold: number; netSales: number }>;
  topProducts: Array<{ product: string; itemsSold: number; netSales: number }>;
};

type GroupBy = "day" | "week";
type ChartKind = "line" | "bar";
type CompareMode = "none" | "previous_period" | "previous_year";
type DateRange = { from: Date; to: Date };

// ── Date Utilities ─────────────────────────────────────────────────────────────

const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const sowk = (d: Date) => { const n = d.getDay(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - n); };
const eowk = (d: Date) => { const n = d.getDay(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - n), 23, 59, 59, 999); };
const som = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const soq = (d: Date) => { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1); };
const eoq = (d: Date) => { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999); };
const soy = (d: Date) => new Date(d.getFullYear(), 0, 1);
const eoy = (d: Date) => new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
const subDays = (d: Date, n: number) => new Date(d.getTime() - n * 86400000);
const subYears = (d: Date, n: number) =>
  new Date(d.getFullYear() - n, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "wtd", label: "Week to date" },
  { key: "mtd", label: "Month to date" },
  { key: "qtd", label: "Quarter to date" },
  { key: "ytd", label: "Year to date" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last_week", label: "Last week" },
  { key: "last_month", label: "Last month" },
  { key: "last_quarter", label: "Last quarter" },
  { key: "last_year", label: "Last year" },
] as const;

function getPresetRange(key: string): DateRange {
  const now = new Date();
  switch (key) {
    case "today":      return { from: sod(now), to: now };
    case "wtd":        return { from: sowk(sod(now)), to: now };
    case "mtd":        return { from: som(now), to: now };
    case "qtd":        return { from: soq(now), to: now };
    case "ytd":        return { from: soy(now), to: now };
    case "yesterday":  { const y = subDays(sod(now), 1); return { from: y, to: eod(y) }; }
    case "last_week":  { const w = subDays(sowk(sod(now)), 7); return { from: w, to: eowk(w) }; }
    case "last_month": { const m = new Date(now.getFullYear(), now.getMonth() - 1, 1); return { from: som(m), to: eom(m) }; }
    case "last_quarter": {
      const q = soq(now);
      const pq = new Date(q.getFullYear(), q.getMonth() - 3, 1);
      return { from: soq(pq), to: eoq(pq) };
    }
    case "last_year":  { const y = new Date(now.getFullYear() - 1, 0, 1); return { from: soy(y), to: eoy(y) }; }
    default:           return { from: sod(now), to: now };
  }
}

function getCompareRange(main: DateRange, mode: CompareMode): DateRange | null {
  if (mode === "none") return null;
  if (mode === "previous_year") return { from: subYears(main.from, 1), to: subYears(main.to, 1) };
  const durationMs = main.to.getTime() - main.from.getTime();
  return { from: new Date(main.from.getTime() - durationMs), to: new Date(main.from.getTime() - 1) };
}

// ── Chart Utilities ────────────────────────────────────────────────────────────

type Bucket = { date: string; netSales: number; orders: number };
type ChartPoint = { label: string; netSales: number; orders: number; compareNetSales?: number; compareOrders?: number };

function groupOrders(orders: RawOrder[], groupBy: GroupBy): Bucket[] {
  const buckets = new Map<string, { netSales: number; orders: number }>();
  for (const order of orders) {
    const d = new Date(order.created_at);
    let key: string;
    if (groupBy === "day") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } else {
      const dow = d.getDay();
      const ws = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
      key = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
    }
    const ex = buckets.get(key) ?? { netSales: 0, orders: 0 };
    buckets.set(key, { netSales: ex.netSales + (order.estimated_total ?? 0), orders: ex.orders + 1 });
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

function fmtLabel(dateStr: string, groupBy: GroupBy) {
  const d = new Date(dateStr + "T00:00:00");
  if (groupBy === "day") return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  return `Wk ${d.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`;
}

function buildChart(current: RawOrder[], compare: RawOrder[] | null, groupBy: GroupBy) {
  const cb = groupOrders(current, groupBy);
  const kb = compare ? groupOrders(compare, groupBy) : [];
  const len = Math.max(cb.length, kb.length);
  const chart: ChartPoint[] = Array.from({ length: len }, (_, i) => ({
    label: cb[i] ? fmtLabel(cb[i].date, groupBy) : "—",
    netSales: cb[i]?.netSales ?? 0,
    orders: cb[i]?.orders ?? 0,
    compareNetSales: kb[i]?.netSales,
    compareOrders: kb[i]?.orders,
  }));
  return { chart, cb, kb };
}

// ── Formatting ─────────────────────────────────────────────────────────────────

const peso = (v: number) => `₱${v.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
const pctChange = (c: number, p: number) => (p === 0 ? null : ((c - p) / p) * 100);
const fmtPct = (n: number | null) => {
  if (n === null) return null;
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
};

// ── Chart Panel ────────────────────────────────────────────────────────────────

const AXIS_STYLE = { fontFamily: "monospace", fontSize: 10, fill: "rgba(235,187,180,0.4)" } as const;

type ChartPanelProps = {
  title: string;
  icon: string;
  dataKey: "netSales" | "orders";
  compareKey: "compareNetSales" | "compareOrders";
  chart: ChartPoint[];
  cb: Bucket[];
  kb: Bucket[];
  chartType: ChartKind;
  groupBy: GroupBy;
  hasCompare: boolean;
  fmt: (v: number) => string;
  color: string;
  dimColor: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(96,62,57,0.4)", padding: "8px 12px" }}>
      <p style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(235,187,180,0.5)", marginBottom: 4 }}>{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <p key={p.name} style={{ fontFamily: "monospace", fontSize: 11, color: p.color }}>
          {p.name}: {fmt(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

function ChartPanel({ title, icon, dataKey, compareKey, chart, cb, kb, chartType, groupBy, hasCompare, fmt, color, dimColor }: ChartPanelProps) {
  const ChartComp = chartType === "line" ? LineChart : BarChart;

  return (
    <div className="bg-[#1a1a1a] border border-[#603e39]/30">
      <div className="px-5 py-3 border-b border-[#603e39]/20 flex items-center gap-2">
        <span className="material-symbols-outlined text-[13px] text-primary">{icon}</span>
        <p className="font-mono text-[11px] tracking-widest uppercase text-[#e2e2e2]">{title}</p>
      </div>

      <div className="px-3 pt-4 pb-2">
        {chart.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center">
            <p className="font-mono text-[11px] text-[#ebbbb4]/30">No data for this period.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ChartComp data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(96,62,57,0.12)" />
              <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmt} width={70} />
              <Tooltip content={(props) => <ChartTooltip {...props} fmt={fmt} />} />
              {chartType === "line" ? (
                <>
                  <Line type="monotone" dataKey={dataKey} name={title} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                  {hasCompare && (
                    <Line type="monotone" dataKey={compareKey} name={`${title} (compare)`} stroke={dimColor} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  )}
                </>
              ) : (
                <>
                  <Bar dataKey={dataKey} name={title} fill={color} fillOpacity={0.85} radius={[2, 2, 0, 0]} />
                  {hasCompare && <Bar dataKey={compareKey} name={`${title} (compare)`} fill={dimColor} radius={[2, 2, 0, 0]} />}
                </>
              )}
            </ChartComp>
          </ResponsiveContainer>
        )}
      </div>

      <div className="px-5 pb-4 space-y-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#ebbbb4]/25 mb-1">Date range</p>
          {cb.length === 0 ? (
            <p className="font-mono text-[11px] text-[#ebbbb4]/25">—</p>
          ) : (
            <div className="max-h-32 overflow-y-auto">
              <table className="w-full">
                <tbody className="divide-y divide-[#603e39]/10">
                  {cb.map((b) => (
                    <tr key={b.date}>
                      <td className="py-1 font-mono text-[11px] text-[#ebbbb4]/50">{fmtLabel(b.date, groupBy)}</td>
                      <td className="py-1 font-mono text-[11px] text-[#e2e2e2] text-right">{fmt(dataKey === "netSales" ? b.netSales : b.orders)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {hasCompare && (
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[#ebbbb4]/25 mb-1">Compare to</p>
            {kb.length === 0 ? (
              <p className="font-mono text-[11px] text-[#ebbbb4]/25">—</p>
            ) : (
              <div className="max-h-32 overflow-y-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-[#603e39]/10">
                    {kb.map((b) => (
                      <tr key={b.date}>
                        <td className="py-1 font-mono text-[11px] text-[#ebbbb4]/35">{fmtLabel(b.date, groupBy)}</td>
                        <td className="py-1 font-mono text-[11px] text-[#ebbbb4]/50 text-right">{fmt(dataKey === "netSales" ? b.netSales : b.orders)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<string>("mtd");
  const [compareMode, setCompareMode] = useState<CompareMode>("none");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [chartType, setChartType] = useState<ChartKind>("line");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const mainRange = useMemo(() => getPresetRange(preset), [preset]);
  const compareRange = useMemo(() => getCompareRange(mainRange, compareMode), [mainRange, compareMode]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from: mainRange.from.toISOString(), to: mainRange.to.toISOString() });
    if (compareRange) {
      params.set("compareFrom", compareRange.from.toISOString());
      params.set("compareTo", compareRange.to.toISOString());
    }
    try {
      const res = await fetch(`/api/admin/analytics?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [mainRange, compareRange]);

  useEffect(() => { load(); }, [load]);

  const { chart, cb, kb } = useMemo(
    () => data ? buildChart(data.currentOrders, data.compareOrders, groupBy) : { chart: [], cb: [], kb: [] },
    [data, groupBy]
  );

  const perf = data?.performance;
  const cPerf = data?.comparePerformance;
  const hasCompare = compareMode !== "none" && !!data?.compareOrders;

  const KPI = [
    {
      label: "Total Sales",
      value: perf ? peso(perf.totalSales) : "—",
      compare: cPerf ? peso(cPerf.totalSales) : null,
      pct: perf && cPerf ? fmtPct(pctChange(perf.totalSales, cPerf.totalSales)) : null,
      icon: "payments",
    },
    {
      label: "Net Sales",
      value: perf ? peso(perf.netSales) : "—",
      compare: cPerf ? peso(cPerf.netSales) : null,
      pct: perf && cPerf ? fmtPct(pctChange(perf.netSales, cPerf.netSales)) : null,
      icon: "trending_up",
    },
    {
      label: "Orders",
      value: perf ? perf.orders.toLocaleString() : "—",
      compare: cPerf ? cPerf.orders.toLocaleString() : null,
      pct: perf && cPerf ? fmtPct(pctChange(perf.orders, cPerf.orders)) : null,
      icon: "receipt_long",
    },
    {
      label: "Products Sold",
      value: perf ? perf.productsSold.toLocaleString() : "—",
      compare: cPerf ? cPerf.productsSold.toLocaleString() : null,
      pct: perf && cPerf ? fmtPct(pctChange(perf.productsSold, cPerf.productsSold)) : null,
      icon: "inventory_2",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-1">ADMIN // ANALYTICS</p>
          <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">Analytics</h1>
        </div>
        {loading && (
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#ebbbb4]/40">
            <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
            Loading…
          </span>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="bg-[#1a1a1a] border border-[#603e39]/30 p-4 space-y-3">
        <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/40">Date Range</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`px-3 py-1.5 font-mono text-[11px] tracking-wide border transition-colors ${
                preset === key
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-[#603e39]/30 text-[#ebbbb4]/50 hover:text-[#e2e2e2] hover:border-[#603e39]/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#603e39]/20 mt-1">
          <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#ebbbb4]/40">Compare to</span>
          {(["none", "previous_period", "previous_year"] as CompareMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setCompareMode(mode)}
              className={`px-3 py-1.5 font-mono text-[11px] tracking-wide border transition-colors ${
                compareMode === mode
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-[#603e39]/30 text-[#ebbbb4]/50 hover:text-[#e2e2e2] hover:border-[#603e39]/60"
              }`}
            >
              {mode === "none" ? "None" : mode === "previous_period" ? "Previous period" : "Previous year"}
            </button>
          ))}
        </div>
      </div>

      {/* Performance KPIs */}
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#ebbbb4]/30 mb-3">Performance</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {KPI.map(({ label, value, compare, pct, icon }) => {
            const up = pct?.startsWith("+");
            return (
              <div key={label} className="bg-[#1a1a1a] border border-[#603e39]/30 p-4">
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest mb-2">
                  <span className="material-symbols-outlined text-[13px]">{icon}</span>
                  {label}
                </div>
                <p className="font-inter font-black text-[22px] text-[#e2e2e2] leading-none">{value}</p>
                {compare && pct && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="font-mono text-[11px] text-[#ebbbb4]/30">{compare}</span>
                    <span
                      className={`font-mono text-[10px] flex items-center gap-0.5 ${up ? "text-green-400" : "text-red-400"}`}
                    >
                      <span className="material-symbols-outlined text-[10px]">{up ? "arrow_upward" : "arrow_downward"}</span>
                      {pct}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#ebbbb4]/30">Charts</p>
          <div className="flex items-center gap-2">
            <div className="flex border border-[#603e39]/30 overflow-hidden">
              {(["day", "week"] as GroupBy[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors border-r border-[#603e39]/30 last:border-r-0 ${
                    groupBy === g ? "bg-primary/10 text-primary" : "text-[#ebbbb4]/40 hover:text-[#e2e2e2]"
                  }`}
                >
                  By {g}
                </button>
              ))}
            </div>
            <div className="flex border border-[#603e39]/30 overflow-hidden">
              {(["line", "bar"] as ChartKind[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors border-r border-[#603e39]/30 last:border-r-0 flex items-center gap-1 ${
                    chartType === t ? "bg-primary/10 text-primary" : "text-[#ebbbb4]/40 hover:text-[#e2e2e2]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {t === "line" ? "show_chart" : "bar_chart"}
                  </span>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartPanel
            title="Net Sales"
            icon="trending_up"
            dataKey="netSales"
            compareKey="compareNetSales"
            chart={chart}
            cb={cb}
            kb={kb}
            chartType={chartType}
            groupBy={groupBy}
            hasCompare={hasCompare}
            fmt={peso}
            color="#ed0d11"
            dimColor="rgba(237,13,17,0.35)"
          />
          <ChartPanel
            title="Orders"
            icon="receipt_long"
            dataKey="orders"
            compareKey="compareOrders"
            chart={chart}
            cb={cb}
            kb={kb}
            chartType={chartType}
            groupBy={groupBy}
            hasCompare={hasCompare}
            fmt={(v) => v.toLocaleString()}
            color="#60a5fa"
            dimColor="rgba(96,165,250,0.35)"
          />
        </div>
      </div>

      {/* Leaderboards */}
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#ebbbb4]/30 mb-4">Leaderboards</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Brands */}
          <div className="bg-[#1a1a1a] border border-[#603e39]/30">
            <div className="px-5 py-3 border-b border-[#603e39]/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[13px] text-primary">storefront</span>
              <p className="font-mono text-[11px] tracking-widest uppercase text-[#e2e2e2]">Top Brands — Items Sold</p>
            </div>
            {!data || data.topBrands.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <span className="material-symbols-outlined text-[28px] text-[#ebbbb4]/15 block mb-2">storefront</span>
                <p className="font-mono text-[11px] text-[#ebbbb4]/30">No data for this period.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#603e39]/20">
                    <th className="px-5 py-2 font-mono text-[9px] uppercase tracking-widest text-[#ebbbb4]/30 text-left w-8">#</th>
                    <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-[#ebbbb4]/30 text-left">Brand</th>
                    <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-[#ebbbb4]/30 text-right">Items Sold</th>
                    <th className="px-5 py-2 font-mono text-[9px] uppercase tracking-widest text-[#ebbbb4]/30 text-right">Net Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#603e39]/10">
                  {data.topBrands.map((row, i) => (
                    <tr key={row.brand} className="hover:bg-[#212121] transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-[#ebbbb4]/25">{i + 1}</td>
                      <td className="px-3 py-3 font-inter font-semibold text-[13px] text-[#e2e2e2]">{row.brand}</td>
                      <td className="px-3 py-3 font-mono text-[12px] text-[#ebbbb4]/60 text-right">{row.itemsSold.toLocaleString()}</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-[#e2e2e2] text-right">{peso(row.netSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-[#1a1a1a] border border-[#603e39]/30">
            <div className="px-5 py-3 border-b border-[#603e39]/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[13px] text-primary">inventory_2</span>
              <p className="font-mono text-[11px] tracking-widest uppercase text-[#e2e2e2]">Top Products — Items Sold</p>
            </div>
            {!data || data.topProducts.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <span className="material-symbols-outlined text-[28px] text-[#ebbbb4]/15 block mb-2">inventory_2</span>
                <p className="font-mono text-[11px] text-[#ebbbb4]/30">No data for this period.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#603e39]/20">
                    <th className="px-5 py-2 font-mono text-[9px] uppercase tracking-widest text-[#ebbbb4]/30 text-left w-8">#</th>
                    <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-[#ebbbb4]/30 text-left">Product</th>
                    <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-[#ebbbb4]/30 text-right">Items Sold</th>
                    <th className="px-5 py-2 font-mono text-[9px] uppercase tracking-widest text-[#ebbbb4]/30 text-right">Net Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#603e39]/10">
                  {data.topProducts.map((row, i) => (
                    <tr key={row.product} className="hover:bg-[#212121] transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-[#ebbbb4]/25">{i + 1}</td>
                      <td className="px-3 py-3 font-inter font-semibold text-[13px] text-[#e2e2e2] max-w-[200px]">
                        <span className="block truncate">{row.product}</span>
                      </td>
                      <td className="px-3 py-3 font-mono text-[12px] text-[#ebbbb4]/60 text-right">{row.itemsSold.toLocaleString()}</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-[#e2e2e2] text-right">{peso(row.netSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
