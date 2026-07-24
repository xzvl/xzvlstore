"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Order, DbProduct } from "@/lib/supabase";

type LedgerEntry = {
  id: string;
  title: string;
  source: string;
  type: "incoming" | "outgoing";
  amount: number;
  entry_date: string;
};

type Account = { no: number; title: string };

const CHART_OF_ACCOUNTS: Account[] = [
  { no: 100, title: "Cash" },
  { no: 101, title: "Accounts Receivable" },
  { no: 200, title: "Accounts Payable" },
  { no: 300, title: "Owner's Capital" },
  { no: 400, title: "Sales Revenue" },
  { no: 401, title: "Sales Discount" },
  { no: 402, title: "Delivery Revenue" },
  { no: 500, title: "Stocks Inventory" },
  { no: 501, title: "Materials Expense" },
  { no: 502, title: "Delivery Expense" },
];

const ACCOUNT_NO: Record<string, number> = Object.fromEntries(CHART_OF_ACCOUNTS.map((a) => [a.title, a.no]));

const normalizeAccountTitle = (raw: string) => raw.trim().toLowerCase().replace(/[’‘]/g, "'");

const ACCOUNT_BY_TITLE: Record<string, Account> = Object.fromEntries(
  CHART_OF_ACCOUNTS.map((a) => [normalizeAccountTitle(a.title), a])
);

// Matches ledger `source` values like "BIR - Materials Expense" or "BIR - Owner's Capital"
// and resolves the account title against the chart of accounts.
function resolveBirAccount(source: string): Account | null {
  const m = /^bir\s*(?:-|:|—)\s*(.+)$/i.exec(source.trim());
  if (!m) return null;
  return ACCOUNT_BY_TITLE[normalizeAccountTitle(m[1])] ?? null;
}

const BIR_TABS: { value: string; label: string }[] = [
  { value: "gj", label: "General Journal" },
  { value: "gl", label: "General Ledger" },
  { value: "crj", label: "Cash Receipt" },
  { value: "cdj", label: "Cash Disbursement" },
];

type JournalLine = { account: string; amount: number };

type Txn = {
  id: string;
  kind: "order" | "ledger";
  cashFlow: "in" | "out";
  date: Date;
  amount: number; // total on the Cash side of the entry
  otherLines: JournalLine[]; // non-cash side of the entry; amounts sum to `amount`
  particulars: string;
};

// Debit/credit lines in journal order: debit side first, then credit side.
function journalLines(t: Txn): { account: string; debit: number; credit: number }[] {
  const isIncoming = t.cashFlow === "in";
  const debitLines = isIncoming ? [{ account: "Cash", amount: t.amount }] : t.otherLines;
  const creditLines = isIncoming ? t.otherLines : [{ account: "Cash", amount: t.amount }];
  return [
    ...debitLines.map((l) => ({ account: l.account, debit: l.amount, credit: 0 })),
    ...creditLines.map((l) => ({ account: l.account, debit: 0, credit: l.amount })),
  ];
}

type JournalRow = {
  n: number;
  date: string;
  account: string;
  pr: string;
  debit: string;
  credit: string;
};

// ─── Date filter helpers (mirrors /admin/orders) ──────────────────────────────

const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { value, label };
  });
}

function defaultDateRange(): { from: Date; to: Date } {
  const year = new Date().getFullYear();
  if (year === 2026) {
    return { from: new Date(2026, 6, 20), to: eod(new Date(2026, 11, 31)) };
  }
  return { from: new Date(year, 0, 1), to: eod(new Date(year, 11, 31)) };
}

function resolveDateRange(dateFilter: string, dateFrom: string, dateTo: string): { from: Date; to: Date } | null {
  if (dateFilter === "all") return null;
  if (dateFilter === "default") return defaultDateRange();
  if (dateFilter === "custom") {
    if (!dateFrom && !dateTo) return null;
    return {
      from: dateFrom ? sod(new Date(dateFrom)) : new Date(0),
      to: dateTo ? eod(new Date(dateTo)) : eod(new Date()),
    };
  }
  const m = /^(\d{4})-(\d{2})$/.exec(dateFilter);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0, 23, 59, 59, 999) };
  }
  return null;
}

// ─── Journal helpers ───────────────────────────────────────────────────────────

const mmdd = (d: Date) => d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", timeZone: "Asia/Manila" });

const pcs = (qty: number) => `${qty}${qty === 1 ? "pc" : "pcs"}`;

function customerLabel(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function paginateTxns(txns: Txn[], pageSize: number): Txn[][] {
  const pages: Txn[][] = [];
  for (let i = 0; i < txns.length; i += pageSize) {
    pages.push(txns.slice(i, i + pageSize));
  }
  return pages;
}

const GJ_ROWS_PER_PAGE = 37; // BIR loose-leaf journal pages are ruled to 37 lines

// A simple 2-line entry takes 4 rows (debit, credit, particulars, blank spacer);
// a compound entry with N extra credit/debit lines takes N-1 more.
function paginateJournalRows(txns: Txn[], maxRows: number = GJ_ROWS_PER_PAGE): Txn[][] {
  const pages: Txn[][] = [];
  let current: Txn[] = [];
  let rowCount = 0;
  for (const t of txns) {
    const rows = t.otherLines.length + 3; // +1 cash line, +1 particulars, +1 blank
    if (current.length > 0 && rowCount + rows > maxRows) {
      pages.push(current);
      current = [];
      rowCount = 0;
    }
    current.push(t);
    rowCount += rows;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

const CASH_ROWS_PER_PAGE = 37; // one row per transaction, so a page holds up to 37 rows

function buildJournalRows(pageTxns: Txn[]): JournalRow[] {
  const rows: JournalRow[] = [];
  let n = 1;
  for (const t of pageTxns) {
    const lines = journalLines(t);
    lines.forEach((line, i) => {
      rows.push({
        n: n++,
        date: i === 0 ? mmdd(t.date) : "",
        account: line.account,
        pr: String(ACCOUNT_NO[line.account] ?? ""),
        debit: line.debit ? line.debit.toLocaleString("en-US") : "",
        credit: line.credit ? line.credit.toLocaleString("en-US") : "",
      });
    });
    rows.push({ n: n++, date: "", account: t.particulars, pr: "", debit: "", credit: "" });
    rows.push({ n: n++, date: "", account: "", pr: "", debit: "", credit: "" });
  }
  return rows;
}

// ─── Table renderers ───────────────────────────────────────────────────────────

function JournalTable({ pages, pagePrefix }: { pages: Txn[][]; pagePrefix: string }) {
  if (pages.length === 0) {
    return <div className="text-center py-16 font-mono text-[13px] text-[#ebbbb4]/30">No entries for this period.</div>;
  }
  return (
    <div className="space-y-8">
      {pages.map((pageTxns, idx) => (
        <div key={idx} className="bg-[#1a1a1a] border border-[#603e39]/30">
          <div className="px-4 py-2.5 border-b border-[#603e39]/30 font-mono text-[11px] tracking-widest uppercase text-primary">
            {pagePrefix} — Page {idx + 1}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#603e39]/20">
                  {["#", "Date", "Account Titles", "PR", "Debit", "Credit", "#"].map((h, i) => (
                    <th
                      key={i}
                      className="font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest px-3 py-2 text-left first:text-center last:text-center"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildJournalRows(pageTxns).map((row) => (
                  <tr key={row.n} className="border-b border-[#603e39]/10">
                    <td className="px-3 py-1.5 font-mono text-[#ebbbb4]/40 text-center">{row.n}</td>
                    <td className="px-3 py-1.5 font-mono text-[#e2e2e2]">{row.date}</td>
                    <td className="px-3 py-1.5 font-mono text-[#e2e2e2]">{row.account}</td>
                    <td className="px-3 py-1.5 font-mono text-[#ebbbb4]/50">{row.pr}</td>
                    <td className="px-3 py-1.5 font-mono text-primary text-right">{row.debit}</td>
                    <td className="px-3 py-1.5 font-mono text-primary text-right">{row.credit}</td>
                    <td className="px-3 py-1.5 font-mono text-[#ebbbb4]/40 text-center">{row.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

type LedgerLine = { date: string; particulars: string; pr: string; amount: number };

function LedgerColumn({ title, lines }: { title: string; lines: LedgerLine[] }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest mb-2">{title}</p>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-[#603e39]/20">
            {["Date", "Particulars", "PR", title].map((h) => (
              <th key={h} className="font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest px-2 py-2 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-2 py-4 font-mono text-[11px] text-[#ebbbb4]/30 text-center">
                No entries
              </td>
            </tr>
          ) : (
            lines.map((l, i) => (
              <tr key={i} className="border-b border-[#603e39]/10">
                <td className="px-2 py-1.5 font-mono text-[#e2e2e2]">{l.date}</td>
                <td className="px-2 py-1.5 font-mono text-[#e2e2e2] truncate max-w-[220px]">{l.particulars}</td>
                <td className="px-2 py-1.5 font-mono text-[#ebbbb4]/50">{l.pr}</td>
                <td className="px-2 py-1.5 font-mono text-primary text-right">{l.amount.toLocaleString("en-US")}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

type CashColumn = { label: string; value: (t: Txn) => number };

function CashJournalTable({
  title,
  pages,
  gjPageOf,
  describe,
  columns,
}: {
  title: string;
  pages: Txn[][];
  gjPageOf: Record<string, number>;
  describe: (t: Txn) => string;
  columns: CashColumn[];
}) {
  if (pages.length === 0) {
    return <div className="text-center py-16 font-mono text-[13px] text-[#ebbbb4]/30">No entries for this period.</div>;
  }
  return (
    <div className="space-y-8">
      {pages.map((pageTxns, pageIdx) => {
        const totals = columns.map((c) => pageTxns.reduce((sum, t) => sum + c.value(t), 0));
        return (
          <div key={pageIdx} className="bg-[#1a1a1a] border border-[#603e39]/30">
            <div className="px-4 py-2.5 border-b border-[#603e39]/30 font-mono text-[11px] tracking-widest uppercase text-primary">
              {title} — Page {pageIdx + 1}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#603e39]/20">
                    {["#", "Date", "Description", "PR", ...columns.map((c) => c.label), "#"].map((h, i) => (
                      <th
                        key={i}
                        className="font-mono text-[10px] text-[#ebbbb4]/40 uppercase tracking-widest px-3 py-2 text-left first:text-center last:text-center"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageTxns.map((t, i) => {
                    const n = i + 1;
                    return (
                      <tr key={t.id} className="border-b border-[#603e39]/10">
                        <td className="px-3 py-1.5 font-mono text-[#ebbbb4]/40 text-center">{n}</td>
                        <td className="px-3 py-1.5 font-mono text-[#e2e2e2] whitespace-nowrap">{mmdd(t.date)}</td>
                        <td className="px-3 py-1.5 font-mono text-[#e2e2e2]">{describe(t)}</td>
                        <td className="px-3 py-1.5 font-mono text-[#ebbbb4]/50 whitespace-nowrap">GJ{gjPageOf[t.id] ?? ""}</td>
                        {columns.map((c, ci) => {
                          const v = c.value(t);
                          return (
                            <td key={ci} className="px-3 py-1.5 font-mono text-primary text-right whitespace-nowrap">
                              {v ? v.toLocaleString("en-US") : ""}
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 font-mono text-[#ebbbb4]/40 text-center">{n}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#603e39]/30">
                    <td colSpan={4} className="px-3 py-2 font-mono text-[11px] text-[#ebbbb4]/50 uppercase tracking-widest text-right">
                      Total
                    </td>
                    {totals.map((tot, i) => (
                      <td key={i} className="px-3 py-2 font-mono text-[13px] text-primary font-bold text-right whitespace-nowrap">
                        {tot.toLocaleString("en-US")}
                      </td>
                    ))}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminBirPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab") ?? "gj";
  const dateFilter = searchParams.get("dateFilter") ?? "default";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  const setParam = (key: string, value: string, def: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === def) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ordersRes, productsRes, ledgerRes] = await Promise.all([
        fetch("/api/admin/orders?status=completed"),
        fetch("/api/admin/products"),
        fetch("/api/admin/ledger"),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (ledgerRes.ok) setLedgerEntries(await ledgerRes.json());
      setLoading(false);
    })();
  }, []);

  const taxableIds = useMemo(() => new Set(products.filter((p) => p.taxable).map((p) => p.id)), [products]);
  const dateRange = useMemo(() => resolveDateRange(dateFilter, dateFrom, dateTo), [dateFilter, dateFrom, dateTo]);

  const allTxns = useMemo<Txn[]>(() => {
    const birOrders = orders.filter((o) => !!o.official_receipt?.trim());

    const orderTxns: Txn[] = birOrders.map((o) => {
      const taxableItems = o.items.filter((it) => it.product_id && taxableIds.has(it.product_id));
      const salesTotal = taxableItems.reduce((s, it) => s + it.subtotal, 0);
      const shippingFee = o.shipping_fee || 0;

      // Sales Revenue and Delivery Revenue land on the same cash receipt:
      // one Debit Cash for (order total + shipping fee), split across two credit lines.
      const otherLines: JournalLine[] = [];
      if (salesTotal > 0) otherLines.push({ account: "Sales Revenue", amount: salesTotal });
      if (shippingFee > 0) otherLines.push({ account: "Delivery Revenue", amount: shippingFee });

      const itemsSummary = taxableItems.map((it) => `${pcs(it.qty)} of ${it.product}`).join(", ");
      const salesParticulars = itemsSummary
        ? `Sale to ${customerLabel(o.name)} (${itemsSummary}) via Receipt #${o.official_receipt}`
        : `Delivery fee from ${customerLabel(o.name)} via Receipt #${o.official_receipt}`;

      return {
        id: `order-${o.id}-cash-in`,
        kind: "order" as const,
        cashFlow: "in" as const,
        date: new Date(o.created_at),
        amount: salesTotal + shippingFee,
        otherLines,
        particulars: salesParticulars,
      };
    }).filter((t) => t.otherLines.length > 0);

    // Courier fees aren't paid out per order — they're settled once at month-end,
    // so all shipping fees for the month are totaled into a single Delivery Expense entry.
    const shippingByMonth = new Map<string, number>();
    for (const o of birOrders) {
      const fee = o.shipping_fee || 0;
      if (fee <= 0) continue;
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      shippingByMonth.set(key, (shippingByMonth.get(key) ?? 0) + fee);
    }

    const deliveryExpenseTxns: Txn[] = Array.from(shippingByMonth.entries()).map(([key, total]) => {
      const [year, month] = key.split("-").map(Number);
      const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return {
        id: `delivery-expense-${key}`,
        kind: "ledger" as const,
        cashFlow: "out" as const,
        date: new Date(year, month + 1, 0), // last day of the month
        amount: total,
        otherLines: [{ account: "Delivery Expense", amount: total }],
        particulars: `${monthLabel} Summary: Total monthly courier fees and packaging materials per attached receipts.`,
      };
    });

    const ledgerTxns: Txn[] = ledgerEntries
      .filter((e) => {
        const source = e.source.trim().toLowerCase();
        return source === "bankee" || source === "bir" || source === "business" || /^bir\s*(?:-|:|—)/i.test(e.source.trim());
      })
      .map((e) => {
        const source = e.source.trim().toLowerCase();
        const birAccount = resolveBirAccount(e.source);
        // Legacy sources (no "BIR - Account Title" suffix) fall back to their old default account.
        const otherAccount = birAccount?.title ?? (source === "bankee" ? "Stocks Inventory" : "Materials Expense");
        const isIncoming = e.type === "incoming";
        return {
          id: `ledger-${e.id}`,
          kind: "ledger" as const,
          cashFlow: isIncoming ? ("in" as const) : ("out" as const),
          date: new Date(e.entry_date),
          amount: e.amount,
          otherLines: [{ account: otherAccount, amount: e.amount }],
          particulars: e.title,
        };
      });

    return [...orderTxns, ...deliveryExpenseTxns, ...ledgerTxns]
      .filter((t) => !dateRange || (t.date >= dateRange.from && t.date <= dateRange.to))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [orders, ledgerEntries, taxableIds, dateRange]);

  const gjPages = useMemo(() => paginateJournalRows(allTxns), [allTxns]);
  const crjPages = useMemo(
    () => paginateTxns(allTxns.filter((t) => t.cashFlow === "in"), CASH_ROWS_PER_PAGE),
    [allTxns]
  );
  const cdjPages = useMemo(
    () => paginateTxns(allTxns.filter((t) => t.cashFlow === "out"), CASH_ROWS_PER_PAGE),
    [allTxns]
  );

  const gjPageOf = useMemo(() => {
    const map: Record<string, number> = {};
    gjPages.forEach((page, idx) => page.forEach((t) => { map[t.id] = idx + 1; }));
    return map;
  }, [gjPages]);

  const ledgerByAccount = useMemo(() => {
    const flatLines = allTxns.flatMap((t) =>
      journalLines(t).map((line) => ({ ...line, txnId: t.id, date: t.date, particulars: t.particulars }))
    );
    return CHART_OF_ACCOUNTS.map((acc) => ({
      account: acc,
      debit: flatLines
        .filter((l) => l.debit > 0 && l.account === acc.title)
        .map((l) => ({ date: mmdd(l.date), particulars: l.particulars, pr: `GJ${gjPageOf[l.txnId]}`, amount: l.debit })),
      credit: flatLines
        .filter((l) => l.credit > 0 && l.account === acc.title)
        .map((l) => ({ date: mmdd(l.date), particulars: l.particulars, pr: `GJ${gjPageOf[l.txnId]}`, amount: l.credit })),
    }));
  }, [allTxns, gjPageOf]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-1 uppercase">ADMIN // BIR TAX</p>
        <h1 className="font-inter font-black text-[28px] uppercase text-[#e2e2e2]">BIR - Books of Account</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#603e39]/30 pb-0 overflow-x-auto overflow-y-hidden scrollbar-x-5">
        {BIR_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setParam("tab", t.value, "gj")}
            className={`px-4 py-2 font-mono text-[11px] tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.value
                ? "text-primary border-primary"
                : "text-[#ebbbb4]/40 border-transparent hover:text-[#e2e2e2]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={dateFilter}
          onChange={(e) => setParam("dateFilter", e.target.value, "default")}
          className="bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-3 py-1.5 focus:outline-none focus:border-primary transition-colors"
        >
          <option value="all">All Dates</option>
          <option value="default">Default</option>
          <option value="custom">Custom</option>
          {monthOptions().map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {dateFilter === "custom" && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setParam("dateFrom", e.target.value, "")}
              className="bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-3 py-1.5 focus:outline-none focus:border-primary transition-colors"
            />
            <span className="font-mono text-[10px] text-[#ebbbb4]/30">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setParam("dateTo", e.target.value, "")}
              className="bg-[#0e0e0e] border border-[#603e39] text-[#e2e2e2] font-mono text-[12px] px-3 py-1.5 focus:outline-none focus:border-primary transition-colors"
            />
          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-8">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading…
        </div>
      ) : tab === "gj" ? (
        <JournalTable pages={gjPages} pagePrefix="General Journal" />
      ) : tab === "crj" ? (
        <CashJournalTable
          title="Cash Receipt Journal"
          pages={crjPages}
          gjPageOf={gjPageOf}
          describe={(t) => t.particulars}
          columns={[
            { label: "Debit Cash", value: (t) => t.amount },
            { label: "Debit Discount", value: () => 0 },
            { label: "Debit Accounts Receivable", value: () => 0 },
            { label: "Credit Sales", value: (t) => t.otherLines.find((l) => l.account === "Sales Revenue")?.amount ?? 0 },
            { label: "Credit Delivery", value: (t) => t.otherLines.find((l) => l.account === "Delivery Revenue")?.amount ?? 0 },
            {
              label: "Credit Other Accounts",
              value: (t) =>
                t.otherLines
                  .filter((l) => l.account !== "Sales Revenue" && l.account !== "Delivery Revenue")
                  .reduce((s, l) => s + l.amount, 0),
            },
          ]}
        />
      ) : tab === "cdj" ? (
        <CashJournalTable
          title="Cash Disbursement Journal"
          pages={cdjPages}
          gjPageOf={gjPageOf}
          describe={(t) => t.particulars}
          columns={[
            { label: "Credit Cash", value: (t) => t.amount },
            { label: "Debit Stocks Inventory", value: (t) => t.otherLines.find((l) => l.account === "Stocks Inventory")?.amount ?? 0 },
            { label: "Debit Materials Expense", value: (t) => t.otherLines.find((l) => l.account === "Materials Expense")?.amount ?? 0 },
            { label: "Debit Delivery Expense", value: (t) => t.otherLines.find((l) => l.account === "Delivery Expense")?.amount ?? 0 },
            {
              label: "Debit Other Accounts",
              value: (t) =>
                t.otherLines
                  .filter((l) => !["Stocks Inventory", "Materials Expense", "Delivery Expense"].includes(l.account))
                  .reduce((s, l) => s + l.amount, 0),
            },
          ]}
        />
      ) : (
        <div className="space-y-6">
          {ledgerByAccount.map(({ account, debit, credit }, idx) => (
            <div key={account.no} className="bg-[#1a1a1a] border border-[#603e39]/30">
              <div className="px-4 py-2.5 border-b border-[#603e39]/30 font-mono text-[11px] tracking-widest uppercase text-primary">
                Page: {idx + 1} | Accounts Title: {account.title} | Accounts Number: {account.no}
              </div>
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#603e39]/20 p-4 gap-4 md:gap-0">
                <LedgerColumn title="Debit" lines={debit} />
                <LedgerColumn title="Credit" lines={credit} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminBirPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2 font-mono text-[12px] text-[#ebbbb4]/40 py-8">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading…
      </div>
    }>
      <AdminBirPageInner />
    </Suspense>
  );
}
