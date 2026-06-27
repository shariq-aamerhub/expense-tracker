# Expense Tracker — How to Use

A mobile-first shared expense tracker for two or more people. Upload bills, classify items, and track who owes whom each month.

---

## Getting Started

### 1. Setup

```bash
npm install
```

Create `.env.local` in the project root:
```
JWT_SECRET=any-random-string-at-least-32-characters
```

Start the app:
```bash
npm run dev
# → http://localhost:3000
```

Data is stored as JSON files in `data/` and bill images in `uploads/` (both created automatically on first run).

---

### 2. Sample Accounts

These accounts are pre-seeded and ready to use:

| Email | Name | Password |
|-------|------|----------|
| alice@example.com | Alice | `password123` |
| bob@example.com | Bob | `password123` |
| admin@example.com | Admin | `admin123` |
| malik@example.com | Malik | `admin123` |

Pre-seeded groups:
- **Home Expenses** — Alice & Bob
- **AD** — Admin & Malik

---

### 3. Register a New Account

Go to `/register`, enter your name, email, and password. You'll be logged in automatically.

---

## Core Workflow

### Step 1 — Add an Expense (Quick Capture)

Go to **Add** (the `+` button in the nav) or `/expenses/new`.

1. **Upload a bill** (optional) — drag & drop or tap to browse. JPEG, PNG, or PDF up to 10 MB. OCR will auto-fill the amount, merchant name, and date.
2. Fill in:
   - **Amount** — pre-filled from OCR, edit if needed
   - **Description** — e.g. "Weekly groceries"
   - **Number of items** *(optional)* — if OCR didn't extract items, this pre-fills that many blank rows on the approval screen
   - **Merchant / Store**
   - **Date**
   - **Paid by** — who physically paid
3. Tap **Save & Add to Pending**.

The expense is saved with status `pending` and does not affect balances yet.

---

### Step 2 — Approve Expenses (Classify & Confirm)

Go to **Pending** in the nav (shows a badge count when items are waiting).

1. Tap any pending expense to open the approval screen.
2. You'll see the bill image (if uploaded), and a list of line items from OCR (or blank rows if you set an item count).
3. For each item:
   - Set the **amount** if blank
   - Toggle **Common** (split equally) or **Personal** (assign to one member)
   - Choose a **category** (Grocery, Food, Transport, etc.)
   - For common items, select which members to split between
4. Confirm **Total Amount** and **Paid by**.
5. Tap **Approve & Update Balances** — the expense is submitted and balances update immediately.

To discard a mistaken entry, tap **Delete Expense**.

---

### Step 3 — View Balances

Go to **Dashboard** (`/dashboard`).

- Positive balance = this person is owed money
- Negative balance = this person owes money
- The pending banner shows how many expenses still need approval

Select a different month using the month picker to view historical balances.

---

### Step 4 — Record a Settlement

When someone pays the other person back:

1. Go to **Settle** (`/settlements`)
2. Tap **New Settlement**
3. Enter: who paid, who received, amount, date, optional note
4. Save — the balance updates immediately

---

### Step 5 — Close the Month

At the end of the month, go to **Statement** (`/statement`):

1. Review the full breakdown: each person's total paid, total share, personal expenses, common share, and net balance
2. Tap **Close Month** to freeze the month
3. The final balance carries forward automatically to the next month as a starting balance

---

## Groups

- Create a group from **Groups** (`/groups`)
- Add members by searching their email address
- Each group tracks its own expenses, settlements, and monthly statements
- If you belong to multiple groups, a group selector appears on the dashboard and pending pages

---

## Tips

- **OCR works best** with clear, well-lit photos of printed receipts. Blurry or angled shots may extract incorrect amounts — always verify the amount field after upload.
- **"Number of items"** on the upload form is useful when the bill has multiple items but OCR couldn't extract them — it pre-creates that many blank rows to fill in on the approval screen.
- **Personal items** (like a purchase only one person made) are assigned to that person and don't affect the other member's balance.
- **Common items** are split equally among all selected participants by default. You can deselect members to split between a subset.
- Expenses show in the Recent Expenses list on the dashboard regardless of status. Pending items link directly to the approval screen.
