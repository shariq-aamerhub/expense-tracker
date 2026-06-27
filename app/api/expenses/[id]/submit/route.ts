import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readExpenses, writeExpenses, readGroups, readMonths, writeMonths } from '@/lib/data';
import { calculateExpenseShares } from '@/lib/calculations';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;
  const expenses = await readExpenses();
  const idx = expenses.findIndex((e) => e.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const groups = await readGroups();
  const group = groups.find((g) => g.id === expenses[idx].groupId);
  if (!group?.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (expenses[idx].status === 'submitted') return NextResponse.json({ error: 'Already submitted' }, { status: 400 });

  // Final calculation before submitting
  expenses[idx].calculatedShares = calculateExpenseShares(expenses[idx]);
  expenses[idx].status = 'submitted';
  await writeExpenses(expenses);

  // Ensure month record exists for this group/month
  const { groupId, month } = expenses[idx];
  const months = await readMonths();
  const existingMonth = months.find((m) => m.groupId === groupId && m.month === month);

  if (!existingMonth) {
    // Find carry forward from previous closed month
    const closedMonths = months
      .filter((m) => m.groupId === groupId && m.status === 'closed')
      .sort((a, b) => b.month.localeCompare(a.month));

    const carryForward = closedMonths.length > 0 ? closedMonths[0].finalBalances : {};

    const newMonth = {
      id: uuidv4(),
      groupId,
      month,
      status: 'open' as const,
      closedAt: null,
      carryForward,
      finalBalances: {},
    };
    await writeMonths([...months, newMonth]);
  }

  return NextResponse.json(expenses[idx]);
}
