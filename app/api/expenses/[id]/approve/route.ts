import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readExpenses, writeExpenses, readGroups, readMonths, writeMonths } from '@/lib/data';
import { calculateExpenseShares } from '@/lib/calculations';
import type { LineItem } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;

  const expenses = await readExpenses();
  const idx = expenses.findIndex((e) => e.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const groups = await readGroups();
  const group = groups.find((g) => g.id === expenses[idx].groupId);
  if (!group?.memberIds.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (expenses[idx].status !== 'pending') {
    return NextResponse.json({ error: 'Expense is not pending' }, { status: 400 });
  }

  const body = await req.json();
  const { lineItems, paidBy, totalAmount, splitRatio } = body as {
    lineItems?: Partial<LineItem>[];
    paidBy?: string;
    totalAmount?: number;
    splitRatio?: Record<string, number>; // userId → weight (e.g. 50/50 or custom %)
  };

  // Apply updates from the approval form
  if (lineItems) {
    expenses[idx].lineItems = lineItems.map((item) => ({
      id: item.id || uuidv4(),
      name: item.name || '',
      qty: item.qty ?? 1,
      unitPrice: item.unitPrice ?? item.total ?? 0,
      total: item.total ?? 0,
      type: item.type || 'common',
      responsibleMemberId: item.responsibleMemberId || null,
      participantIds: item.participantIds || group.memberIds,
      category: item.category || 'Others',
    }));
  }

  if (paidBy) expenses[idx].paidBy = paidBy;
  if (totalAmount != null) expenses[idx].totalAmount = Number(totalAmount);

  // Validate line items sum matches total
  if (expenses[idx].lineItems.length > 0) {
    const lineItemsTotal = expenses[idx].lineItems.reduce((s, i) => s + i.total, 0);
    const diff = Math.abs(lineItemsTotal - expenses[idx].totalAmount);
    if (diff > 0.01) {
      return NextResponse.json(
        { error: `Line items total (AED ${lineItemsTotal.toFixed(2)}) does not match bill total (AED ${expenses[idx].totalAmount.toFixed(2)})` },
        { status: 400 }
      );
    }
  }

  // Calculate shares from line item classification
  expenses[idx].calculatedShares = calculateExpenseShares(expenses[idx]);

  // If custom split ratio provided (and no line items or line items sum to 0), apply it
  if (splitRatio && Object.keys(splitRatio).length > 0) {
    const hasLineItemShares = Object.values(expenses[idx].calculatedShares).some((v) => v > 0);
    if (!hasLineItemShares) {
      const total = expenses[idx].totalAmount;
      const weightSum = Object.values(splitRatio).reduce((s, v) => s + v, 0);
      const shares: Record<string, number> = {};
      for (const [memberId, weight] of Object.entries(splitRatio)) {
        shares[memberId] = (weight / weightSum) * total;
      }
      expenses[idx].calculatedShares = shares;
    }
  }

  // If still no shares (no line items, no splitRatio), split equally among all members
  if (Object.keys(expenses[idx].calculatedShares).length === 0) {
    const total = expenses[idx].totalAmount;
    const perMember = total / group.memberIds.length;
    const shares: Record<string, number> = {};
    for (const memberId of group.memberIds) {
      shares[memberId] = perMember;
    }
    expenses[idx].calculatedShares = shares;
  }

  expenses[idx].status = 'submitted';
  await writeExpenses(expenses);

  // Ensure month record exists
  const { groupId, month } = expenses[idx];
  const months = await readMonths();
  const existingMonth = months.find((m) => m.groupId === groupId && m.month === month);

  if (!existingMonth) {
    const closedMonths = months
      .filter((m) => m.groupId === groupId && m.status === 'closed')
      .sort((a, b) => b.month.localeCompare(a.month));

    const carryForward = closedMonths.length > 0 ? closedMonths[0].finalBalances : {};

    await writeMonths([
      ...months,
      {
        id: uuidv4(),
        groupId,
        month,
        status: 'open' as const,
        closedAt: null,
        carryForward,
        finalBalances: {},
      },
    ]);
  }

  return NextResponse.json(expenses[idx]);
}
