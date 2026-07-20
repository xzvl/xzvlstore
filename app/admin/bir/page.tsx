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
  { no: 500, title: "Stocks Expense" },
  { no: 501, title: "Materials Expense" },
];

const ACCOUNT_NO: Record<string, number> = Object.fromEntries(CHART_OF_ACCOUNTS.map((a) => [a.title, a.no]));

const BIR_TABS: { value: string; label: string }[] = [
  { value: "gj", label: "General Journal" },
  { value: "gl", label: "General Ledger" },
  { value: "crj", label: "Cash Receipt" },
  { value: "cdj", label: "Cash Disbursement" },
];

const TXNS_PER_PAGE = 9; // 4 rows/txn × 9 = 36 rows, capped under the 37-row page limit

type Txn = {
  id: string;
  kind: "order" | "ledger";
  date: Date;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  particulars: string;
  qty?: number;
  productName?: string;
  customerName?: string;
};

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

function paginateTxns(txns: Txn[], pageSize: number = TXNS_PER_PAGE): Txn[][] {
  const pages: Txn[][] = [];
  for (let i = 0; i < txns.length; i += pageSize) {
    pages.push(txns.slice(i, i + pageSize));
  }
  return pages;
}

const CASH_ROWS_PER_PAGE = 37; // one row per transaction, so a page holds up to 37 rows

function buildJournalRows(pageTxns: Txn[]): JournalRow[] {
  const rows: JournalRow[] = [];
  let n = 1;
  for (const t of pageTxns) {
    rows.push({
      n: n++,
      date: mmdd(t.date),
      account: t.debitAccount,
      pr: String(ACCOUNT_NO[t.debitAccount] ?? ""),
      debit: t.amount.toLocaleString(),
      credit: "",
    });
    rows.push({ n: n++, date: "", account: t.creditAccount, pr: "", debit: "", credit: t.amount.toLocaleString() });
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
                <td className="px-2 py-1.5 font-mono text-primary text-right">{l.amount.toLocaleString()}</td>
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
                              {v ? v.toLocaleString() : ""}
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
                        {tot.toLocaleString()}
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
    const orderTxns: Txn[] = orders
      .filter((o) => !!o.official_receipt?.trim())
      .flatMap((o) =>
        o.items
          .filter((it) => it.product_id && taxableIds.has(it.product_id))
          .map((it, idx) => ({
            id: `order-${o.id}-${idx}`,
            kind: "order" as const,
            date: new Date(o.created_at),
            debitAccount: "Cash",
            creditAccount: "Sales Revenue",
            amount: it.subtotal,
            particulars: `Sales on ${pcs(it.qty)} of ${it.product}`,
            qty: it.qty,
            productName: it.product,
            customerName: o.name,
          }))
    );

    const ledgerTxns: Txn[] = ledgerEntries
      .filter((e) => e.type === "outgoing" && (e.source.trim().toLowerCase() === "bankee" || e.source.trim().toLowerCase() === "bir" || e.source.trim().toLowerCase() === "business" ))
      .map((e) => {
        const source = e.source.trim().toLowerCase();
        const debitAccount = source === "bankee" ? "Stocks Expense" : "Materials Expense";
        return {
          id: `ledger-${e.id}`,
          kind: "ledger" as const,
          date: new Date(e.entry_date),
          debitAccount,
          creditAccount: "Cash",
          amount: e.amount,
          particulars: e.title,
        };
      });

    return [...orderTxns, ...ledgerTxns]
      .filter((t) => !dateRange || (t.date >= dateRange.from && t.date <= dateRange.to))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [orders, ledgerEntries, taxableIds, dateRange]);

  const gjPages = useMemo(() => paginateTxns(allTxns), [allTxns]);
  const crjPages = useMemo(
    () => paginateTxns(allTxns.filter((t) => t.kind === "order"), CASH_ROWS_PER_PAGE),
    [allTxns]
  );
  const cdjPages = useMemo(
    () => paginateTxns(allTxns.filter((t) => t.kind === "ledger"), CASH_ROWS_PER_PAGE),
    [allTxns]
  );

  const gjPageOf = useMemo(() => {
    const map: Record<string, number> = {};
    gjPages.forEach((page, idx) => page.forEach((t) => { map[t.id] = idx + 1; }));
    return map;
  }, [gjPages]);

  const ledgerByAccount = useMemo(() => {
    return CHART_OF_ACCOUNTS.map((acc) => ({
      account: acc,
      debit: allTxns
        .filter((t) => t.debitAccount === acc.title)
        .map((t) => ({ date: mmdd(t.date), particulars: t.particulars, pr: `GJ${gjPageOf[t.id]}`, amount: t.amount })),
      credit: allTxns
        .filter((t) => t.creditAccount === acc.title)
        .map((t) => ({ date: mmdd(t.date), particulars: t.particulars, pr: `GJ${gjPageOf[t.id]}`, amount: t.amount })),
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
          describe={(t) => `${customerLabel(t.customerName ?? "")} Bought ${pcs(t.qty ?? 0)} of ${t.productName ?? ""}`}
          columns={[
            { label: "Debit Cash", value: (t) => t.amount },
            { label: "Debit Discount", value: () => 0 },
            { label: "Debit Accounts Receivable", value: () => 0 },
            { label: "Credit Sales", value: (t) => t.amount },
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
            { label: "Debit Stocks Expense", value: (t) => (t.debitAccount === "Stocks Expense" ? t.amount : 0) },
            { label: "Debit Materials Expense", value: (t) => (t.debitAccount === "Materials Expense" ? t.amount : 0) },
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
