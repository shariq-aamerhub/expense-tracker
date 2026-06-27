# Expense Tracker

A shared expense tracking app for small groups — upload bills, OCR-parse line items, classify common vs. personal spend, and settle monthly balances.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Tesseract.js OCR · JSON file storage

---

## Features

- Bill photo upload with automatic OCR parsing
- Line item classification (common / personal)
- Per-member balance calculation with carry-forward
- Monthly statement and settlement tracking
- Mobile-first UI

---

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

Create `.env.local` in the project root:

```
JWT_SECRET=any-string-at-least-32-chars
```

### Run

```bash
npm run dev       # dev server at http://localhost:3000
npm run build     # production build
npm run lint      # ESLint
npx tsc --noEmit  # type-check
```

### Test OCR parsing

```bash
node scripts/ocr-worker.js uploads/<filename>.jpeg
```

---

## Docker Deployment

### Prerequisites

- Docker + Docker Compose
- `JWT_SECRET` set in your environment or a `.env` file at the project root

```bash
# .env
JWT_SECRET=your-secret-at-least-32-chars
```

### Commands

Use the included `deploy.sh` script:

```bash
./deploy.sh up        # build image and start (detached) → http://localhost:3003
./deploy.sh down      # stop and remove containers
./deploy.sh restart   # down + rebuild + up
./deploy.sh logs      # tail container logs
```

Or use Docker Compose directly:

```bash
docker compose up --build -d
docker compose down
docker compose logs -f
```

### Persistent storage

Data and uploads are stored in named Docker volumes (`app_data`, `app_uploads`) so they survive container restarts and rebuilds.

---

## Sample Accounts

All accounts use password `password123` unless noted.

| Email | Name | Password |
|-------|------|----------|
| alice@example.com | Alice | `password123` |
| bob@example.com | Bob | `password123` |
| admin@example.com | Admin | `admin123` |
| malik@example.com | Malik | `admin123` |

Pre-seeded groups:
- **Home Expenses** — Alice + Bob
- **AD** — Admin + Malik

---

## Architecture

| Concern | Approach |
|---------|----------|
| Storage | JSON files under `data/` — no database |
| Auth | HttpOnly JWT cookie (`jose` at Edge, `jsonwebtoken` in API routes) |
| OCR | Tesseract.js in a child process to avoid Next.js HMR conflicts |
| Writes | `async-mutex` + atomic tmp-rename per file to prevent corruption |
| Routing | Next.js App Router — `app/(auth)/` public, `app/(app)/` protected |
