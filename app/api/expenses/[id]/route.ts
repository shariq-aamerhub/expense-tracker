import { NextRequest, NextResponse } from 'next/server';
import { readExpenses, writeExpenses, readGroups } from '@/lib/data';
import { calculateExpenseShares } from '@/lib/calculations';
import type { LineItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;
  const expenses = await readExpenses();
  const expense = expenses.find((e) => e.id === params.id);
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const groups = await readGroups();
  const group = groups.find((g) => g.id === expense.groupId);
  if (!group?.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json(expense);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;
  const expenses = await readExpenses();
  const idx = expenses.findIndex((e) => e.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const groups = await readGroups();
  const group = groups.find((g) => g.id === expenses[idx].groupId);
  if (!group?.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (expenses[idx].status === 'pending') return NextResponse.json({ error: 'Cannot edit a pending expense' }, { status: 400 });

  const body = await req.json();
  const { billDate, merchant, description, totalAmount, paidBy, lineItems } = body;

  if (billDate) expenses[idx].billDate = billDate;
  if (merchant) expenses[idx].merchant = merchant.trim();
  if (description !== undefined) expenses[idx].description = description;
  if (totalAmount != null) expenses[idx].totalAmount = Number(totalAmount);
  if (paidBy) expenses[idx].paidBy = paidBy;
  if (lineItems) {
    expenses[idx].lineItems = lineItems.map((item: Partial<LineItem>) => ({
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

  expenses[idx].calculatedShares = calculateExpenseShares(expenses[idx]);
  await writeExpenses(expenses);
  return NextResponse.json(expenses[idx]);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;
  const expenses = await readExpenses();
  const expense = expenses.find((e) => e.id === params.id);
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const groups = await readGroups();
  const group = groups.find((g) => g.id === expense.groupId);
  if (!group?.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (expense.status === 'submitted') return NextResponse.json({ error: 'Cannot delete submitted expense' }, { status: 400 });

  await writeExpenses(expenses.filter((e) => e.id !== params.id));
  return NextResponse.json({ ok: true });
}
