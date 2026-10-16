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

// A ledger income recorded against an official BIR receipt carries the receipt
// number in its title, e.g. "Sale to Juan D. via Receipt #12345" or just
// "Receipt #12345". Those are revenue from a receipted sale, so the BIR books
// treat them as Sales Revenue — the same account as a receipted order.
const RECEIPT_REF_RE = /receipt\s*#\s*[\w-]+/i;

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

// ─── Date filter helpers ───────────────────────────────────────────────────────

const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// The books start on the BIR registration date; every later year is covered in full.
const BIR_REGISTERED = new Date(2026, 6, 20);

function birYears(): number[] {
  const years: number[] = [];
  for (let y = new Date().getFullYear(); y >= BIR_REGISTERED.getFullYear(); y--) years.push(y);
  return years;
}

function yearCoverage(year: number): { from: Date; to: Date } {
  const from = year === BIR_REGISTERED.getFullYear() ? BIR_REGISTERED : new Date(year, 0, 1);
  return { from, to: eod(new Date(year, 11, 31)) };
}

// "YYYY-MM-DD" <-> local Date (new Date("YYYY-MM-DD") would parse as UTC).
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

const DATE_INPUT = "bg-deep border border-line text-fg tabular-nums text-[12px] px-3 py-1.5 focus:outline-none focus:border-primary transition-colors rounded-md focus:ring-2 focus:ring-primary/20";

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
    return <div className="text-center py-16 tabular-nums text-[13px] text-accent/50">No entries for this period.</div>;
  }
  return (
    <div className="space-y-8">
      {pages.map((pageTxns, idx) => (
        <div key={idx} className="bg-panel border border-line/30 rounded-lg">
          <div className="px-4 py-2.5 border-b border-line/30 tabular-nums text-[11px] text-primary font-medium">
            {pagePrefix} — Page {idx + 1}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-line/20">
                  {["#", "Date", "Account Titles", "PR", "Debit", "Credit", "#"].map((h, i) => (
                    <th
                      key={i}
                      className="tabular-nums text-[10px] text-accent/60 uppercase px-3 py-2 text-left first:text-center last:text-center tracking-wider font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildJournalRows(pageTxns).map((row) => (
                  <tr key={row.n} className="border-b border-line/10">
                    <td className="px-3 py-1.5 tabular-nums text-accent/60 text-center">{row.n}</td>
                    <td className="px-3 py-1.5 tabular-nums text-fg">{row.date}</td>
                    <td className="px-3 py-1.5 tabular-nums text-fg">{row.account}</td>
                    <td className="px-3 py-1.5 tabular-nums text-accent/70">{row.pr}</td>
                    <td className="px-3 py-1.5 tabular-nums text-primary text-right">{row.debit}</td>
                    <td className="px-3 py-1.5 tabular-nums text-primary text-right">{row.credit}</td>
                    <td className="px-3 py-1.5 tabular-nums text-accent/60 text-center">{row.n}</td>
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
      <p className="tabular-nums text-[10px] text-accent/60 uppercase mb-2 tracking-wider font-medium">{title}</p>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-line/20">
            {["Date", "Particulars", "PR", title].map((h) => (
              <th key={h} className="tabular-nums text-[10px] text-accent/60 uppercase px-2 py-2 text-left tracking-wider font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-2 py-4 tabular-nums text-[11px] text-accent/50 text-center">
                No entries
              </td>
            </tr>
          ) : (
            lines.map((l, i) => (
              <tr key={i} className="border-b border-line/10">
                <td className="px-2 py-1.5 tabular-nums text-fg">{l.date}</td>
                <td className="px-2 py-1.5 tabular-nums text-fg truncate max-w-[220px]">{l.particulars}</td>
                <td className="px-2 py-1.5 tabular-nums text-accent/70">{l.pr}</td>
                <td className="px-2 py-1.5 tabular-nums text-primary text-right">{l.amount.toLocaleString("en-US")}</td>
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
    return <div className="text-center py-16 tabular-nums text-[13px] text-accent/50">No entries for this period.</div>;
  }
  return (
    <div className="space-y-8">
      {pages.map((pageTxns, pageIdx) => {
        const totals = columns.map((c) => pageTxns.reduce((sum, t) => sum + c.value(t), 0));
        return (
          <div key={pageIdx} className="bg-panel border border-line/30 rounded-lg">
            <div className="px-4 py-2.5 border-b border-line/30 tabular-nums text-[11px] text-primary font-medium">
              {title} — Page {pageIdx + 1}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-line/20">
                    {["#", "Date", "Description", "PR", ...columns.map((c) => c.label), "#"].map((h, i) => (
                      <th
                        key={i}
                        className="tabular-nums text-[10px] text-accent/60 uppercase px-3 py-2 text-left first:text-center last:text-center tracking-wider font-medium"
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
                      <tr key={t.id} className="border-b border-line/10">
                        <td className="px-3 py-1.5 tabular-nums text-accent/60 text-center">{n}</td>
                        <td className="px-3 py-1.5 tabular-nums text-fg whitespace-nowrap">{mmdd(t.date)}</td>
                        <td className="px-3 py-1.5 tabular-nums text-fg">{describe(t)}</td>
                        <td className="px-3 py-1.5 tabular-nums text-accent/70 whitespace-nowrap">GJ{gjPageOf[t.id] ?? ""}</td>
                        {columns.map((c, ci) => {
                          const v = c.value(t);
                          return (
                            <td key={ci} className="px-3 py-1.5 tabular-nums text-primary text-right whitespace-nowrap">
                              {v ? v.toLocaleString("en-US") : ""}
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 tabular-nums text-accent/60 text-center">{n}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line/30">
                    <td colSpan={4} className="px-3 py-2 tabular-nums text-[11px] text-accent/70 text-right font-medium">
                      Total
                    </td>
                    {totals.map((tot, i) => (
                      <td key={i} className="px-3 py-2 tabular-nums text-[13px] text-primary font-bold text-right whitespace-nowrap">
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

  const years = birYears();
  const currentYear = years[0];
  const tab = searchParams.get("tab") ?? "gj";
  const yearParam = Number(searchParams.get("year"));
  const year = years.includes(yearParam) ? yearParam : currentYear;
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  // null (or the default value) removes the param from the URL.
  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const setParam = (key: string, value: string, def: string) => setParams({ [key]: value === def ? null : value });

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
  const coverage = useMemo(() => yearCoverage(year), [year]);

  // The start/end date inputs narrow the selected year; they can't reach outside it.
  const dateRange = useMemo(() => {
    const from = parseYmd(dateFrom);
    const to = parseYmd(dateTo);
    return {
      from: from && from > coverage.from ? from : coverage.from,
      to: to && eod(to) < coverage.to ? eod(to) : coverage.to,
    };
  }, [coverage, dateFrom, dateTo]);

  // Unfiltered by the start/end date inputs — the quarterly BIR summary boxes
  // always reflect the selected year's real calendar quarters, regardless of
  // what the journal/ledger tabs are narrowed to.
  const allTxnsRaw = useMemo<Txn[]>(() => {
    // Each order books on its payment date; if none is set, the order date.
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
        date: new Date(o.payment_date ?? o.created_at),
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
      const d = new Date(o.payment_date ?? o.created_at);
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
        const hasReceiptRef = e.type === "incoming" && RECEIPT_REF_RE.test(e.title);
        return source === "bankee" || source === "bir" || source === "business"
          || /^bir\s*(?:-|:|—)/i.test(e.source.trim())
          || hasReceiptRef;
      })
      .map((e) => {
        const source = e.source.trim().toLowerCase();
        const isIncoming = e.type === "incoming";
        const birAccount = resolveBirAccount(e.source);
        // Explicit "BIR - Account Title" source wins; otherwise an income tagged
        // with a receipt number books to Sales Revenue, and legacy sources fall
        // back to their old default account.
        const otherAccount =
          birAccount?.title ??
          (isIncoming && RECEIPT_REF_RE.test(e.title)
            ? "Sales Revenue"
            : source === "bankee"
            ? "Stocks Inventory"
            : "Materials Expense");
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
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [orders, ledgerEntries, taxableIds]);

  const allTxns = useMemo(
    () => allTxnsRaw.filter((t) => t.date >= dateRange.from && t.date <= dateRange.to),
    [allTxnsRaw, dateRange]
  );

  // ─── Quarterly BIR income-tax return summary boxes ────────────────────────
  const birReturns = useMemo(() => {
    const creditSales = (from: Date, to: Date) =>
      allTxnsRaw
        .filter((t) => t.cashFlow === "in" && t.date >= from && t.date <= to)
        .reduce((sum, t) => sum + (t.otherLines.find((l) => l.account === "Sales Revenue")?.amount ?? 0), 0);

    const periods = [
      { title: "BIR Form 1701Q Q1", cover: "January 1 to March 31", deadline: "Deadline May 15", from: new Date(year, 0, 1), to: eod(new Date(year, 2, 31)) },
      { title: "BIR Form 1701Q Q2", cover: "April 1 to June 30", deadline: "Deadline August 15", from: new Date(year, 3, 1), to: eod(new Date(year, 5, 30)) },
      { title: "BIR Form 1701Q Q3", cover: "July 1 to September 30", deadline: "Deadline November 15", from: new Date(year, 6, 1), to: eod(new Date(year, 8, 30)) },
      { title: "BIR Form 1701 MS", cover: "January 1 to December 31", deadline: `Deadline April 15, ${year + 1}`, from: new Date(year, 0, 1), to: eod(new Date(year, 11, 31)) },
    ];

    return periods.map((p) => ({ ...p, creditSales: creditSales(p.from, p.to) }));
  }, [allTxnsRaw, year]);

  const annualCreditSales = useMemo(
    () => birReturns.find((r) => r.title === "BIR Form 1701 MS")?.creditSales ?? 0,
    [birReturns]
  );

  // 8% flat income tax rate on gross sales/receipts in excess of ₱250,000
  // (the graduated-rate exemption threshold), applied to the full year.
  const annualTaxDue = useMemo(
    () => Math.max(0, annualCreditSales - 250000) * 0.08,
    [annualCreditSales]
  );

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
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-semibold text-fg text-[22px] tracking-tight">BIR - Books of Account</h1>
        <select
          value={year}
          onChange={(e) => setParams({ year: e.target.value === String(currentYear) ? null : e.target.value, dateFrom: null, dateTo: null })}
          className={DATE_INPUT}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Quarterly BIR income-tax return summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {birReturns.map((r) => (
          <div key={r.title} className="bg-panel border border-line/30 p-4 space-y-1.5 rounded-lg">
            <p className="tabular-nums text-[11px] text-fg font-bold font-medium">{r.title}</p>
            <p className="tabular-nums text-[10px] text-accent/60">{r.cover}</p>
            <p className="tabular-nums text-[10px] text-red-400">{r.deadline}</p>
            <p className="font-semibold text-[22px] text-primary pt-1">₱{r.creditSales.toLocaleString()}</p>
          </div>
        ))}
        <div className="bg-panel border border-line/30 p-4 space-y-1.5 rounded-lg">
          <p className="tabular-nums text-[11px] text-fg font-bold font-medium">Annual Income Tax Due</p>
          <p className="tabular-nums text-[10px] text-accent/60">(Gross Sales − ₱250,000) × 8%</p>
          <p className="tabular-nums text-[10px] text-red-400">
            (₱{annualCreditSales.toLocaleString()} − ₱250,000) × 8%
          </p>
          <p className="font-semibold text-[22px] text-primary pt-1">
            ₱{annualTaxDue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabs + start/end date */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
        <div className="flex-1 min-w-0 flex items-center gap-1 border-b border-line/30 pb-0 overflow-x-auto overflow-y-hidden scrollbar-x-5">
          {BIR_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setParam("tab", t.value, "gj")}
              className={`px-4 py-2 tabular-nums text-[11px] transition-colors border-b-2 -mb-px whitespace-nowrap font-medium rounded-none ${
                tab === t.value
                  ? "text-primary border-primary"
                  : "text-accent/60 border-transparent hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 md:pb-1">
          <input
            type="date"
            aria-label="Start date"
            value={ymd(dateRange.from)}
            min={ymd(coverage.from)}
            max={ymd(dateRange.to)}
            onChange={(e) => setParam("dateFrom", e.target.value, ymd(coverage.from))}
            className={`${DATE_INPUT} min-w-0 flex-1 md:flex-none`}
          />
          <span className="tabular-nums text-[10px] text-accent/50">to</span>
          <input
            type="date"
            aria-label="End date"
            value={ymd(dateRange.to)}
            min={ymd(dateRange.from)}
            max={ymd(coverage.to)}
            onChange={(e) => setParam("dateTo", e.target.value, ymd(coverage.to))}
            className={`${DATE_INPUT} min-w-0 flex-1 md:flex-none`}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 tabular-nums text-[12px] text-accent/60 py-8">
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
            <div key={account.no} className="bg-panel border border-line/30 rounded-lg">
              <div className="px-4 py-2.5 border-b border-line/30 tabular-nums text-[11px] text-primary font-medium">
                Page: {idx + 1} | Accounts Title: {account.title} | Accounts Number: {account.no}
              </div>
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-line/20 p-4 gap-4 md:gap-0">
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
      <div className="flex items-center gap-2 tabular-nums text-[12px] text-accent/60 py-8">
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
        Loading…
      </div>
    }>
      <AdminBirPageInner />
    </Suspense>
  );
}
