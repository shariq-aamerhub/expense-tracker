import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readExpenses, writeExpenses, readGroups } from '@/lib/data';
import { calculateExpenseShares } from '@/lib/calculations';
import type { Expense, LineItem } from '@/lib/types';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');
  const month = searchParams.get('month');

  const [expenses, groups] = await Promise.all([readExpenses(), readGroups()]);
  const myGroupIds = groups.filter((g) => g.memberIds.includes(userId)).map((g) => g.id);

  let filtered = expenses.filter((e) => myGroupIds.includes(e.groupId));
  if (groupId) filtered = filtered.filter((e) => e.groupId === groupId);
  if (month) filtered = filtered.filter((e) => e.month === month);

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  try {
    const body = await req.json();
    const { groupId, billDate, merchant, description, itemCount, billImagePath, ocrRawText, totalAmount, paidBy, lineItems, status: requestedStatus } = body;

    if (!groupId || !billDate || !merchant || totalAmount == null || !paidBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const groups = await readGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group || !group.memberIds.includes(userId)) {
      return NextResponse.json({ error: 'Group not found or access denied' }, { status: 403 });
    }

    const month = billDate.slice(0, 7); // "2026-01"

    const processedItems: LineItem[] = (lineItems || []).map((item: Partial<LineItem>) => ({
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

    const allowedStatuses = ['draft', 'pending'];
    const initialStatus = allowedStatuses.includes(requestedStatus) ? requestedStatus : 'draft';

    const expense: Expense = {
      id: uuidv4(),
      groupId,
      month,
      billDate,
      merchant: merchant.trim(),
      description: description || '',
      itemCount: itemCount != null ? Number(itemCount) : null,
      billImagePath: billImagePath || null,
      ocrRawText: ocrRawText || null,
      totalAmount: Number(totalAmount),
      paidBy,
      lineItems: processedItems,
      calculatedShares: {},
      status: initialStatus,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    expense.calculatedShares = calculateExpenseShares(expense);

    const expenses = await readExpenses();
    await writeExpenses([...expenses, expense]);
    return NextResponse.json(expense, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
