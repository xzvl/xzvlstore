// Parsing and verification of proof-of-payment screenshots (GCash, Maya, bank
// transfer receipts). The OCR itself runs server-side (lib/payment-proof-ocr.ts);
// everything here is pure so the storefront can share the types.

/** What was read off a payment screenshot. */
export type PaymentExtraction = {
  /** Best guess at the amount paid, or null if none was found. */
  amount: number | null;
  /** Every peso amount found on the screenshot. */
  amounts: number[];
  /** Normalized reference number (uppercase, no spaces or dashes). */
  reference: string | null;
  /** Transaction date as YYYY-MM-DD. */
  date: string | null;
};

export type PaymentFlag =
  | "ocr_failed"
  | "amount_not_found"
  | "amount_mismatch"
  | "reference_not_found"
  | "duplicate_reference"
  | "date_not_found"
  | "date_out_of_range";

/** Stored on the order as `payment_verification`. */
export type PaymentVerification = PaymentExtraction & {
  verified: boolean;
  expected_amount: number;
  flags: PaymentFlag[];
  checked_at: string;
};

export const FLAG_LABELS: Record<PaymentFlag, string> = {
  ocr_failed: "Couldn't read the screenshot",
  amount_not_found: "No amount found",
  amount_mismatch: "Amount doesn't match",
  reference_not_found: "No reference number found",
  duplicate_reference: "Reference number already used on another order",
  date_not_found: "No date found",
  // Date flags are no longer raised; kept so older orders' stored flags still have labels.
  date_out_of_range: "Payment date isn't recent",
};

// ─── Parsing ──────────────────────────────────────────────────────────────────

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";

// Peso amounts. OCR often reads "₱" as "P", "F", "#" or "$". A bare number only
// counts when it has centavos, so phone and reference digits aren't picked up.
const AMOUNT_RE = /(?<![a-z0-9])(?:₱|php|p|f|#|\$)\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+(?:\.\d{2})?)\b|(?<![\d.,])(\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})\b/gi;
const AMOUNT_LINE_RE = /amount|total|sent|paid|payment|transfer|php|₱/i;
const REF_LABEL_RE = /\bref(?:erence)?\.?\s*(?:number|num|no|id|code|#)?\.?\s*[:#.]?\s*/i;

const toAmount = (s: string) => Number(s.replace(/,/g, ""));
const pad = (n: number) => String(n).padStart(2, "0");

function validDate(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parseAmounts(lines: string[]): { amount: number | null; amounts: number[] } {
  const found: { value: number; preferred: boolean }[] = [];
  for (const line of lines) {
    for (const m of line.matchAll(AMOUNT_RE)) {
      const value = toAmount(m[1] ?? m[2]);
      if (value > 0 && value < 10_000_000) found.push({ value, preferred: AMOUNT_LINE_RE.test(line) || !!m[1] });
    }
  }
  const amounts = Array.from(new Set(found.map((f) => f.value)));
  const preferred = found.filter((f) => f.preferred).map((f) => f.value);
  const pool = preferred.length ? preferred : amounts;
  return { amount: pool.length ? Math.max(...pool) : null, amounts };
}

// Takes the reference value from the text after its label: consecutive tokens
// made of uppercase letters/digits with at least one digit, so "1234 567
// 890123 Oct 15, 2026" stops before the date.
function referenceFrom(text: string): string | null {
  const tokens: string[] = [];
  for (const tok of text.trim().split(/\s+/)) {
    const t = tok.replace(/[.,:;]+$/, "");
    if (!/^[A-Z0-9-]+$/.test(t) || !/\d/.test(t)) break;
    tokens.push(t);
    if (!/^[A-Z0-9-]+$/.test(tok)) break; // trailing punctuation ends the value
  }
  const ref = tokens.join("").replace(/-/g, "");
  return ref.length >= 6 && (ref.match(/\d/g) ?? []).length >= 4 ? ref : null;
}

function parseReference(lines: string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(REF_LABEL_RE);
    if (!m || m.index == null) continue;
    const rest = lines[i].slice(m.index + m[0].length);
    const ref = referenceFrom(rest) ?? (rest.trim() === "" && lines[i + 1] ? referenceFrom(lines[i + 1]) : null);
    if (ref) return ref;
  }
  // GCash reference numbers are 13 digits, often printed as "1234 567 890123".
  const gcash = lines.join(" ").match(/\b(\d{4})\s?(\d{3})\s?(\d{6})\b/);
  return gcash ? gcash.slice(1).join("") : null;
}

function parseDate(text: string): string | null {
  let m = text.match(new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "i"));
  if (m) return validDate(+m[3], MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2]);
  m = text.match(new RegExp(`\\b(\\d{1,2})\\s+${MONTH_RE},?\\s+(\\d{4})\\b`, "i"));
  if (m) return validDate(+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]);
  m = text.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  // Numeric dates are read as MM/DD/YYYY, the usual format on PH e-wallets.
  m = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/);
  if (m) return validDate(+m[3], +m[1], +m[2]) ?? validDate(+m[3], +m[2], +m[1]);
  return null;
}

/** Pulls the amount, reference number and date out of OCR text. */
export function parsePaymentText(text: string): PaymentExtraction {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return { ...parseAmounts(lines), reference: parseReference(lines), date: parseDate(text) };
}

// ─── Verification ─────────────────────────────────────────────────────────────

/**
 * Checks an extraction against the amount the order expects. Verified only
 * when the amount matches and a reference number was found and isn't on
 * another order. The date is read when present but doesn't affect the result.
 */
export function verifyPayment(
  extraction: PaymentExtraction | null,
  expectedAmount: number,
  duplicateReference: boolean
): PaymentVerification {
  const ex = extraction ?? { amount: null, amounts: [], reference: null, date: null };
  const flags: PaymentFlag[] = [];
  let amount = ex.amount;

  if (!extraction) flags.push("ocr_failed");
  if (ex.amounts.length === 0) {
    flags.push("amount_not_found");
  } else {
    const match = ex.amounts.find((a) => Math.abs(a - expectedAmount) < 0.01);
    if (match != null) amount = match;
    else flags.push("amount_mismatch");
  }
  if (!ex.reference) flags.push("reference_not_found");
  else if (duplicateReference) flags.push("duplicate_reference");

  return {
    ...ex,
    amount,
    verified: flags.length === 0,
    expected_amount: expectedAmount,
    flags,
    checked_at: new Date().toISOString(),
  };
}

/** One-line summary for the order notes and the admin email. */
export function verificationNote(v: PaymentVerification): string {
  const read = [
    v.amount != null ? `₱${v.amount.toLocaleString()}` : null,
    v.reference ? `ref ${v.reference}` : null,
    v.date,
  ].filter(Boolean).join(", ");
  if (v.verified) return `Proof of payment auto-verified (${read}).`;
  const issues = v.flags
    .map((f) => (f === "amount_mismatch" ? `${FLAG_LABELS[f]} (expected ₱${v.expected_amount.toLocaleString()})` : FLAG_LABELS[f]))
    .join("; ");
  return `Proof of payment needs review: ${issues}.${read ? ` Read: ${read}.` : ""}`;
}
