import { execFile } from 'child_process';
import path from 'path';
import type { OcrParsedBill, OcrLineItem } from './types';

const WORKER_SCRIPT = path.join(process.cwd(), 'scripts', 'ocr-worker.js');

export function extractTextFromFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [WORKER_SCRIPT, filePath],
      { timeout: 60_000, maxBuffer: 5 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`OCR worker failed: ${stderr || error.message}`));
          return;
        }
        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) reject(new Error(result.error));
          else resolve(result.text || '');
        } catch {
          reject(new Error('Failed to parse OCR worker output'));
        }
      }
    );
  });
}

export async function extractTextFromImage(imagePath: string): Promise<string> {
  return extractTextFromFile(imagePath);
}

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  return extractTextFromFile(pdfPath);
}

export function parseReceiptText(rawText: string): OcrParsedBill {
  const rawLines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  // Keep cleaned line paired with the original raw line so skip-checks can see both
  const cleanedPairs: { raw: string; clean: string }[] = rawLines
    .map((r) => ({ raw: r, clean: cleanLine(r) }))
    .filter((p) => p.clean.length > 0);

  const lines = cleanedPairs.map((p) => p.clean);
  const merchant = parseMerchant(rawLines);
  const date = parseDate(rawText);
  const total = parseTotal(lines, rawLines);
  const lineItems = parseLineItems(cleanedPairs);

  return { merchant, date, total, lineItems, rawText };
}

// ─── Line cleaning ────────────────────────────────────────────────────────────

function cleanLine(line: string): string {
  let s = line
    .replace(/^[\s=\-—|>~_:§£]+/, '')
    .replace(/[\s=\-—|>~_:]+$/, '')
    .trim();

  let changed = true;
  while (changed) {
    changed = false;
    const m = s.match(/^([A-Za-z]{1,3}|[^A-Za-z0-9\s]{1,3})\s+(.+)$/);
    if (m) {
      const token = m[1];
      const rest = m[2];
      const isNoise =
        token.length <= 2 ||
        /^[^a-zA-Z0-9]+$/.test(token) ||
        /^[A-Z]{2,3}$/.test(token) ||
        /^[a-z]{2,3}$/.test(token) ||
        /^[A-Z][a-z]{2}$/.test(token);
      // Don't strip if the whole string is pure words with no digits (e.g. "M T SHIRT A", "L SHOES OFFER")
      const wholeLineIsWords = /^[A-Za-z]([A-Za-z\s]*)$/.test(s) && !/\d/.test(s);
      if (isNoise && !wholeLineIsWords) {
        s = rest.trim();
        changed = true;
      }
    }
  }

  // Strip trailing noise after the last digit
  let rdi = -1;
  for (let i = s.length - 1; i >= 0; i--) {
    if (/\d/.test(s[i])) { rdi = i; break; }
  }
  if (rdi >= 0) {
    const after = s.slice(rdi + 1);
    if (/^[\s=\-—|>~_]*([A-Za-z]{1,4}[\s=\-—|>~_]*)*$/.test(after)) {
      s = s.slice(0, rdi + 1).trim();
    }
  }

  return s.trim();
}

// ─── Merchant ─────────────────────────────────────────────────────────────────

function parseMerchant(rawLines: string[]): string {
  for (const line of rawLines.slice(0, 20)) {
    const cleaned = cleanLine(line);
    if (
      cleaned.length >= 3 &&
      cleaned.length <= 50 &&
      /[a-zA-Z]{3,}/.test(cleaned) &&
      !/^\d/.test(cleaned) &&
      !/^(tel|fax|trn|tax|invoice|behind|phone|www|http|po box|branch|airport|street|road)/i.test(cleaned) &&
      !/\d{5,}/.test(cleaned)
    ) {
      const words = cleaned.split(/\s+/);
      while (words.length > 1 && words[words.length - 1].length <= 2) {
        words.pop();
      }
      return words.join(' ');
    }
  }
  return '';
}

// ─── Date ─────────────────────────────────────────────────────────────────────

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDate(text: string): string {
  // DD/MM/YYYY — UAE receipt format
  const dmyFull = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (dmyFull) {
    const d = Number(dmyFull[1]), m = Number(dmyFull[2]), y = Number(dmyFull[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return ymd(y, m, d);
  }

  // YYYY/MM/DD or YYYY-MM-DD
  const iso = text.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (iso) {
    const y = Number(iso[1]), m = Number(iso[2]), d = Number(iso[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return ymd(y, m, d);
  }

  // "29/May/2026" or "04 May 2026" or "May 4, 2026"
  const MONTHS: Record<string, number> = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  const mn1 = text.match(/(\d{1,2})[\/\s\-]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\s\-]+(\d{4})/i);
  if (mn1) {
    const d = Number(mn1[1]), m = MONTHS[mn1[2].toLowerCase().slice(0,3)], y = Number(mn1[3]);
    if (m) return ymd(y, m, d);
  }
  const mn2 = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
  if (mn2) {
    const m = MONTHS[mn2[1].toLowerCase().slice(0,3)], d = Number(mn2[2]), y = Number(mn2[3]);
    if (m) return ymd(y, m, d);
  }

  // DD/MM/YY two-digit year — e.g. "23/05/26"
  const dmyShort = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/);
  if (dmyShort) {
    const d = Number(dmyShort[1]), m = Number(dmyShort[2]);
    const y = Number(dmyShort[3]) + (Number(dmyShort[3]) >= 50 ? 1900 : 2000);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return ymd(y, m, d);
  }

  const today = new Date();
  return ymd(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

// ─── Total ────────────────────────────────────────────────────────────────────

// Ordered most-specific → least. VAT-inclusive / card-paid lines come before net amount.
const TOTAL_KEYWORDS = [
  'grand total',
  'vat incl',
  'total incl',
  'total payable',
  'amount due',
  'pay by card',
  'pay by cash',
  'credit card',    // Wearmart: "Credit Card 65.35"
  'total amount',
  'paid mni',       // Safa: "PAID MNI 14.75"
  'payment',        // Wearmart: "Payment (AED) 65.35"
  'net amount',
  'total',
];

const SUBTOTAL_KEYWORDS = [
  'sub total', 'subtotal', 'sub-total',
  'excl',
  'tax amount', 'vat amount', 'vat total', 'vat%',
  'discount', 'savings',
  'balance/',
  'item count', 'items :',
  'balance due: 0', 'balance : 0', 'balance due 0',
  'total bef', 'total before',
  'beforevat', 'before vat',
  'happiness point',
];

function isSubtotalLine(line: string): boolean {
  const lower = line.toLowerCase();
  return SUBTOTAL_KEYWORDS.some((k) => lower.includes(k));
}

function extractLastAmount(text: string): number | null {
  const matches = [
    ...text.matchAll(/[\$₹AED€£]?\s*(\d{1,3}(?:[,]\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2})/g),
  ];
  for (let i = matches.length - 1; i >= 0; i--) {
    const cleaned = matches[i][1].replace(/,/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) return num;
  }
  return null;
}

function parseTotal(lines: string[], rawLines: string[]): number | null {
  const allSets = [lines, rawLines];

  for (const set of allSets) {
    for (const keyword of TOTAL_KEYWORDS) {
      for (let i = set.length - 1; i >= 0; i--) {
        const lower = set[i].toLowerCase();
        if (lower.includes(keyword) && !isSubtotalLine(set[i])) {
          const amount = extractLastAmount(set[i]);
          if (amount !== null && amount > 0) return amount;
        }
      }
    }
  }

  // Fallback: last cleaned line with a decimal amount that isn't a subtotal
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isSubtotalLine(lines[i])) continue;
    const amount = extractLastAmount(lines[i]);
    if (amount !== null && amount > 0) return amount;
  }

  return null;
}

// ─── Line items ───────────────────────────────────────────────────────────────

const LINE_ITEM_SKIP_KEYWORDS = [
  'subtotal', 'sub total', 'sub-total', 'tax', 'vat', 'gst', 'discount',
  'total', 'change', 'payment', 'thank you', 'receipt',
  'invoice', 'bill no', 'date', 'time', 'phone', 'address', 'www',
  'net amount', 'item count', 'items :', 'counter', 'cashier', 'trn', 'fax',
  'balance', 'pay by', 'paid', 'commodity', 'price qty', 'sl ', 's.no',
  'qty price', 'barcode qty', 'description qty', 'happiness point',
  'credit card', 'visa', 'mastercard', 'cash', 'by c.c.', 'by cc',
  'keep', 'exchange', 'refund', 'no cash', 'thank',
];

// Also skip header rows with column name combos
const HEADER_PATTERNS = [
  /\bqty\b.*\bprice\b/i,
  /\bprice\b.*\bqty\b/i,
  /\bprice\b.*\bamt\b/i,
  /\bitem\b.*\bqty\b.*\bprice\b/i,
  /\bdescription\b.*\bqty\b/i,
  /\bbarcode\b.*\bqty\b/i,
  /\bbarcode\b.*\bprice\b/i,
  /\bqty\b.*\bunit\s*price\b/i,
  /\bunit\s*price\b.*\bnet\b/i,
];

function shouldSkipLine(line: string): boolean {
  if (!line || line.length < 3) return true;
  const lower = line.toLowerCase();
  // Pure barcode / long number (13+ digits is EAN barcode)
  if (/^\d{6,}$/.test(line)) return true;
  // Header rows
  if (HEADER_PATTERNS.some((p) => p.test(lower))) return true;
  return LINE_ITEM_SKIP_KEYWORDS.some((k) => lower.includes(k));
}

function cleanItemName(name: string): string {
  return name
    .replace(/^\d+\s+/, '')            // strip leading serial number "1 " "12 "
    .replace(/^[^A-Za-z0-9]+/, '')     // strip leading non-alphanumeric (e.g. "§.", ".")
    .replace(/[=\-—|>~_§]/g, ' ')
    .replace(/\s+VAT@[^$]*/i, '')      // strip trailing "VAT@5%=0.33" annotations
    .replace(/\s+VAT\s*@[^$]*/i, '')
    // strip trailing number tokens that leaked from price/qty columns
    .replace(/(\s+[\d.,]+)+\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Normalize OCR noise in a number token: colons → dot, letter-digits → digits.
// e.g. "10:99:" → "10.99", "1.OY" → "1.00", "1.UD" → "1.00", "4.7%" → "4.79"
function normalizeNumToken(s: string): string {
  return s
    .replace(/[:\s]+$/, '')
    .replace(/:/g, '.')
    .replace(/%$/, '9')              // trailing % is often a misread 9 (e.g. "4.7%" → "4.79")
    .replace(/[oO]/g, '0')
    .replace(/[lI]/g, '1')
    .replace(/[A-Za-z]/g, '0')
    .replace(/\.{2,}/g, '.')
    .replace(/^\./, '0.')
    .replace(/\.$/, '');
}

// Pre-normalize number tokens in a line so patterns match despite OCR noise.
function normalizeLineNumbers(line: string): string {
  return line.replace(/(?<![A-Za-z])(\d[0-9:.]*[A-Za-z%]?[0-9:.]*(?:[A-Za-z%][0-9:.]*)*):?(?![A-Za-z\d])/g, (tok) => {
    const norm = normalizeNumToken(tok.replace(/:$/, ''));
    const n = parseFloat(norm);
    return (isNaN(n) || norm.length === 0) ? tok : norm;
  });
}

// Try all scaling combos to find price × qty ≈ total, tolerating OCR-dropped decimals.
function coerceThreeAmounts(
  rawPrice: string, rawQty: string, rawTotal: string
): { qty: number; unitPrice: number; total: number } | null {
  const p = parseFloat(rawPrice.replace(/,/g, ''));
  const q = parseFloat(rawQty.replace(/,/g, ''));
  const t = parseFloat(rawTotal.replace(/,/g, ''));
  if (isNaN(p) || isNaN(q) || isNaN(t) || t <= 0 || q <= 0) return null;

  const TOLERANCE = (v: number) => v * 0.12 + 0.05;

  const candidates: [number, number, number][] = [
    [p,       q,       t      ],
    [p/100,   q,       t      ],   // price OCR dropped decimal, total correct
    [p/100,   q/100,   t      ],   // both price and qty OCR dropped decimal
    [p,       q/100,   t      ],   // qty OCR dropped decimal
    [p,       q/100,   t/100  ],   // qty and total OCR dropped decimal e.g. "15.99 100 1599"
    [p/100,   q,       t/100  ],
    [p/100,   q/100,   t/100  ],
    [p/10,    q,       t      ],
    [p/10,    q,       t/10   ],
    [p/10,    q/10,    t/10   ],
  ];

  // Prefer candidates where total is in a realistic receipt range (< 10000)
  // and qty is reasonable (≤ 20 for consumer receipts)
  let bestMatch: { qty: number; unitPrice: number; total: number } | null = null;
  for (const [up, uq, ut] of candidates) {
    if (ut <= 0 || uq <= 0) continue;
    if (Math.abs(up * uq - ut) < TOLERANCE(ut)) {
      const candidate = { qty: uq, unitPrice: up, total: ut };
      if (!bestMatch) bestMatch = candidate;
      // Prefer this if it has a more reasonable qty and total
      if (uq <= 20 && ut < 10000 && (bestMatch.qty > 20 || bestMatch.total >= 10000)) {
        bestMatch = candidate;
      }
    }
  }
  return bestMatch;
}

export function parseLineItems(pairs: { raw: string; clean: string }[]): OcrLineItem[] {
  const items: OcrLineItem[] = [];
  const usedAsName = new Set<number>(); // track indices consumed as item names by pattern 0

  for (let idx = 0; idx < pairs.length; idx++) {
    const { raw: correspondingRaw, clean: rawLine } = pairs[idx];
    // Skip if either the cleaned OR the original raw line matches skip keywords —
    // cleanLine may strip "net amount" / "pay by" prefixes leaving just the number
    if (shouldSkipLine(rawLine) || shouldSkipLine(correspondingRaw)) continue;
    const line = normalizeLineNumbers(rawLine);

    // ── Pattern 0: barcode [qty] [price] amount — name on PRECEDING or FOLLOWING line
    // Handles Karakeeb (name above barcode) and Wearmart/Safa (name below barcode).
    // Must run BEFORE pattern 2 so the barcode line isn't parsed as name+numbers.
    // Also handles noisy middle columns (Zsp, BY) — only requires barcode + final amount.
    // e.g. Karakeeb: "M T SHIRT A" then "1000000000474 1.00 20.00 20.00"
    //      Wearmart:  "030043181572 1.00 24.94 24.99" then "MENS JEANS PANY"
    //      Safa:      "731126103169 1.00 7.00 7.00" then "Nacaraya Nuts 160 G"
    const m0full = line.match(
      /^(\d{7,})\s+([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)$/
    );
    // Fallback: barcode + garbage + final amount (e.g. "5921101246461 1.00 Zsp 2.50")
    const m0noisyRaw = !m0full ? line.match(/^(\d{7,})\s+.+\s+([\d,]+\.\d{1,2})$/) : null;
    const m0noisy = m0noisyRaw ?? null;

    const m0 = m0full || m0noisy;
    if (m0) {
      const total = m0full
        ? coerceThreeAmounts(m0full[3], m0full[2], m0full[4])
        : (() => {
            const t = parseFloat((m0noisy as RegExpMatchArray)[2].replace(/,/g, ''));
            return t > 0 ? { qty: 1, unitPrice: t, total: t } : null;
          })();

      if (total) {
        // A good name line: has letters, not a barcode, not a header, not a summary line
        const isNameLine = (s: string) => {
          if (s.length < 2 || !/[A-Za-z]{2,}/.test(s) || /^\d{6,}$/.test(s)) return false;
          // Reject header rows (column labels)
          if (HEADER_PATTERNS.some((p) => p.test(s))) return false;
          const lower = s.toLowerCase();
          const hardSkip = ['total', 'balance', 'pay by', 'paid', 'net amount', 'item count',
            'items :', 'cashier', 'counter', 'invoice', 'date', 'time', 'tax invoice',
            'thank', 'keep', 'exchange', 'refund', 'credit card', 'visa', 'mastercard'];
          return !hardSkip.some((k) => lower.startsWith(k) || lower === k);
        };
        // Look backward first (Karakeeb style — name precedes barcode)
        let name = '';
        let nameIdx = -1;
        for (let j = idx - 1; j >= 0 && j >= idx - 2; j--) {
          if (usedAsName.has(j)) continue;
          const prev = pairs[j].clean;
          if (isNameLine(prev)) { name = cleanItemName(prev); nameIdx = j; break; }
        }
        // If not found backward, look forward (Wearmart/Safa style — name follows barcode)
        if (!name) {
          for (let j = idx + 1; j < pairs.length && j <= idx + 2; j++) {
            if (usedAsName.has(j)) continue;
            const next = pairs[j].clean;
            if (isNameLine(next)) { name = cleanItemName(next); nameIdx = j; break; }
          }
        }
        if (name) {
          if (nameIdx >= 0) usedAsName.add(nameIdx);
          items.push({ name, ...total });
          continue;
        }
      }
    }

    // ── Pattern 1: SL# name price qty total
    // e.g. "1 Nescafe Caramel 2.50 2.00 5.00"  "3 Rattan Basket PCO54 1099 1.00 10.99"
    const m1 = line.match(
      /^(\d{1,3})\s+(.+?)\s+([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)$/
    );
    if (m1) {
      const parsed = coerceThreeAmounts(m1[3], m1[4], m1[5]);
      if (parsed) {
        items.push({ name: cleanItemName(m1[2]), ...parsed });
        continue;
      }
    }

    // ── Pattern 2: name price qty total  (no leading serial number)
    // Skip if the name portion is a pure barcode number
    const m2 = line.match(
      /^(.+?)\s+([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)$/
    );
    if (m2 && !/^\d{6,}$/.test(m2[1].trim())) {
      const parsed = coerceThreeAmounts(m2[2], m2[3], m2[4]);
      if (parsed) {
        items.push({ name: cleanItemName(m2[1]), ...parsed });
        continue;
      }
    }

    // ── Pattern 4: name  qty x unitPrice  total
    // e.g. "Rice 2 x 50.00 100.00"
    const m4 = line.match(
      /^(.+?)\s+(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s+([\d,]+\.\d{1,2})$/
    );
    if (m4) {
      const qty       = parseFloat(m4[2]);
      const unitPrice = parseFloat(m4[3]);
      const total     = parseFloat(m4[4].replace(/,/g, ''));
      if (total > 0) {
        items.push({ name: cleanItemName(m4[1]), qty, unitPrice, total });
        continue;
      }
    }

    // ── Pattern 5: name  total  (2+ spaces gap)
    // e.g. "Shampoo          300.00"
    const m5 = line.match(/^(.+?)\s{2,}([\d,]+\.\d{1,2})$/);
    if (m5) {
      const total = parseFloat(m5[2].replace(/,/g, ''));
      if (total > 0) {
        items.push({ name: cleanItemName(m5[1]), qty: 1, unitPrice: total, total });
        continue;
      }
    }

    // ── Pattern 6: name intQty total
    // e.g. "Soap 2 200.00"
    const m6 = line.match(/^(.+?)\s+(\d{1,3})\s+([\d,]+\.\d{1,2})$/);
    if (m6) {
      const qty   = parseInt(m6[2]);
      const total = parseFloat(m6[3].replace(/,/g, ''));
      if (total > 0 && qty > 0 && qty < 100) {
        items.push({ name: cleanItemName(m6[1]), qty, unitPrice: total / qty, total });
        continue;
      }
    }

    // ── Pattern 7: name  singlePrice  (any gap, decimal required)
    // e.g. "Green Chilly India 0.90"  "Noor Pure Sunflower 011 750ml 12.90"
    const m7 = line.match(/^(.+?)\s+([\d,]+\.\d{1,2})$/);
    if (m7) {
      const name = cleanItemName(m7[1]);
      const total = parseFloat(m7[2].replace(/,/g, ''));
      if (total > 0 && /[A-Za-z]{2,}/.test(name)) {
        items.push({ name, qty: 1, unitPrice: total, total });
      }
    }
  }

  // De-duplicate: Karakeeb look-ahead may produce an item already caught by pattern 1/2 on the name line
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name}|${item.total}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
