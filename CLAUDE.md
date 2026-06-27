# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at localhost:3000
npm run build     # production build
npm run lint      # ESLint
npx tsc --noEmit  # type-check without emitting files
```

No test suite exists — verify changes by running the dev server and exercising the UI.

To manually test OCR parsing against a receipt file:
```bash
node scripts/ocr-worker.js uploads/<filename>.jpeg
```

## Environment

Create `.env.local` in the project root:
```
JWT_SECRET=any-string-at-least-32-chars
```

## Architecture

### Storage
All data is persisted as JSON files under `data/` (gitignored). There is no database.

- `lib/data.ts` — all read/write helpers. Every write uses a per-file `async-mutex` and an atomic `write-to-.tmp → rename` pattern to prevent corruption. All API routes go through these helpers.
- `uploads/` — bill images saved by the OCR endpoint. Served via `app/api/uploads/[filename]/route.ts` (requires auth cookie).

### Auth
- `middleware.ts` — runs at **Edge Runtime**, uses `jose` (`jwtVerify`) — *not* `jsonwebtoken`. Verifies the `auth-token` HttpOnly cookie on every request and injects `x-user-id` header for downstream API routes. Public paths: `/login`, `/register`, `/api/auth/*`.
- `lib/auth.ts` — runs in **Node.js API routes only**, uses `jsonwebtoken` + `bcryptjs`. Do not import `lib/auth.ts` from middleware.

### Expense lifecycle
Expenses move through three statuses:

```
pending  →  submitted
```

- `pending` — created from the quick upload form (`/expenses/new`). Has `totalAmount`, `paidBy`, `description`, optionally a bill image path and OCR raw text. `lineItems` may be empty or pre-populated from OCR.
- `submitted` — set by `POST /api/expenses/[id]/approve`. Line items are classified (common/personal), `calculatedShares` is computed, and a Month record is auto-created if none exists for that group/month.

`draft` status exists in the type but is unused in the current flow.

### Balance calculation (`lib/calculations.ts`)
Pure functions, safe to import client-side:

- `calculateExpenseShares(expense)` — iterates `lineItems`: personal items add to `responsibleMemberId`, common items split equally across `participantIds`.
- `calculateNetBalances(expense)` — payer gets `+totalAmount − share`, everyone else gets `−share`.
- `calculateMonthlyBalances(expenses, settlements, carryForward)` — running balance across the month including carry-forward from prior closed month.

Only `submitted` expenses are counted in balance calculations.

### OCR pipeline
Bill images flow: `BillUpload.tsx` → `POST /api/ocr` (raw binary body, filename in `x-filename` header) → `lib/ocr.ts:extractTextFromFile` → **spawns** `scripts/ocr-worker.js` via `child_process.execFile` → Tesseract.js.

Tesseract runs in a separate child process to avoid conflicts with Next.js HMR. The worker outputs `{ text }` or `{ error }` as JSON to stdout.

`lib/ocr.ts:parseReceiptText` parses the raw Tesseract text:
- `cleanLine()` strips dot-matrix border noise (`= — | Se Ee` etc.) from each line before pattern matching.
- `coerceThreeAmounts()` handles OCR dropping decimal points (`525 100 525` → `5.25 × 1.00 = 5.25`).
- TOTAL_KEYWORDS priority: VAT-inclusive / card-paid lines are checked **before** `net amount` (which is often excl. VAT on UAE receipts).

Debug OCR parsing without uploading via `POST /api/ocr/debug` (send raw binary, returns `{ rawText, parsed }`).

### Month management
When the first expense in a group/month is approved, the approve API auto-creates a `Month` record and copies `finalBalances` from the previous closed month as `carryForward`. Months are closed manually from the Statement page, which freezes balances and seeds the next month's carry-forward.

### UI structure
- `app/(auth)/` — login, register (no layout shell, no auth check)
- `app/(app)/` — all protected pages, share `app/(app)/layout.tsx` which renders the top nav + bottom mobile nav and fetches the pending expense count badge on every navigation
- `components/ui/` — primitive components (Button, Input, Select, Modal, Toast, Badge, Spinner, Card, StepIndicator)
- `components/expense/` — BillUpload, OcrReview, LineItemClassifier, SplitSummary (reused between expense wizard and approve page)

The primary color token is `brand-*` (mapped to blue in `tailwind.config.ts`).

### API conventions
- All API routes under `app/api/` read `x-user-id` from the request header (set by middleware).
- `export const runtime = 'nodejs'` is required on any route that uses `fs`, `child_process`, or `jsonwebtoken`.
- File uploads use raw binary body (`req.arrayBuffer()`) — **not** `req.formData()`, which hangs in Next.js App Router.

## Sample credentials

Pre-seeded accounts in `data/users.json` (password for all: `password123`):

| Email | Name |
|-------|------|
| alice@example.com | Alice |
| bob@example.com | Bob |
| admin@example.com | Admin | (`admin123`) |
| malik@example.com | Malik | (`admin123`) |

Pre-seeded groups:
- **Home Expenses** — Alice + Bob
- **AD** — Admin + Malik
