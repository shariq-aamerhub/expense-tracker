import { NextRequest, NextResponse } from 'next/server';
import { readExpenses, writeExpenses, readGroups } from '@/lib/data';
import { calculateExpenseShares } from '@/lib/calculations';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;

  const expenses = await readExpenses();
  const idx = expenses.findIndex((e) => e.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const groups = await readGroups();
  const group = groups.find((g) => g.id === expenses[idx].groupId);
  if (!group?.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { paidBy } = await req.json();
  if (!paidBy) return NextResponse.json({ error: 'paidBy is required' }, { status: 400 });
  if (!group.memberIds.includes(paidBy)) return NextResponse.json({ error: 'Member not in group' }, { status: 400 });

  expenses[idx].paidBy = paidBy;
  expenses[idx].calculatedShares = calculateExpenseShares(expenses[idx]);

  await writeExpenses(expenses);
  return NextResponse.json(expenses[idx]);
}
