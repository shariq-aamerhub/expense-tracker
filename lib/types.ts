export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
}

export type ItemType = 'common' | 'personal';

export interface LineItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
  type: ItemType;
  responsibleMemberId: string | null;
  participantIds: string[];
  category: string;
}

export type ExpenseStatus = 'draft' | 'pending' | 'submitted';

export interface Expense {
  id: string;
  groupId: string;
  month: string; // "2026-01"
  billDate: string;
  merchant: string;
  billImagePath: string | null;
  ocrRawText: string | null;
  totalAmount: number;
  description: string;
  itemCount: number | null;
  paidBy: string;
  lineItems: LineItem[];
  calculatedShares: Record<string, number>;
  status: ExpenseStatus;
  createdBy: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  month: string;
  paidBy: string;
  receivedBy: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
}

export type MonthStatus = 'open' | 'closed';

export interface Month {
  id: string;
  groupId: string;
  month: string;
  status: MonthStatus;
  closedAt: string | null;
  carryForward: Record<string, number>;
  finalBalances: Record<string, number>;
}

export interface OcrLineItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface OcrParsedBill {
  merchant: string;
  date: string;
  total: number | null;
  lineItems: OcrLineItem[];
  rawText: string;
}

export interface MonthStatement {
  month: string;
  groupId: string;
  status: MonthStatus;
  carryForward: Record<string, number>;
  expenses: Expense[];
  settlements: Settlement[];
  perMember: Record<
    string,
    {
      totalPaid: number;
      totalShare: number;
      personalExpenses: number;
      commonShare: number;
      netBalance: number;
    }
  >;
  finalBalances: Record<string, number>;
  settlement: { from: string; to: string; amount: number } | null;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export const EXPENSE_CATEGORIES = [
  'Grocery',
  'Food',
  'Household',
  'Transport',
  'Medical',
  'Utility',
  'Rent',
  'Personal Care',
  'Entertainment',
  'Others',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
