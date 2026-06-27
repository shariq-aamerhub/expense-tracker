import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readMonths, writeMonths, readGroups, readExpenses, readSettlements, readUsers } from '@/lib/data';
import { calculateMonthStatement } from '@/lib/calculations';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;

  const months = await readMonths();
  const idx = months.findIndex((m) => m.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (months[idx].status === 'closed') return NextResponse.json({ error: 'Already closed' }, { status: 400 });

  const groups = await readGroups();
  const group = groups.find((g) => g.id === months[idx].groupId);
  if (!group?.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { groupId, month } = months[idx];
  const [expenses, settlements, users] = await Promise.all([
    readExpenses(),
    readSettlements(),
    readUsers(),
  ]);

  const monthExpenses = expenses.filter((e) => e.groupId === groupId && e.month === month);
  const monthSettlements = settlements.filter((s) => s.groupId === groupId && s.month === month);
  const members = users.filter((u) => group.memberIds.includes(u.id));

  const statement = calculateMonthStatement(
    monthExpenses,
    monthSettlements,
    members,
    months[idx].carryForward,
    month,
    groupId,
    'closed'
  );

  months[idx].status = 'closed';
  months[idx].closedAt = new Date().toISOString();
  months[idx].finalBalances = statement.finalBalances;

  // Find or create next month record with carry forward
  const nextMonthDate = new Date(month + '-01');
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const existingNext = months.find((m) => m.groupId === groupId && m.month === nextMonth);
  if (!existingNext) {
    months.push({
      id: uuidv4(),
      groupId,
      month: nextMonth,
      status: 'open',
      closedAt: null,
      carryForward: statement.finalBalances,
      finalBalances: {},
    });
  } else if (existingNext.status === 'open') {
    const nextIdx = months.findIndex((m) => m.id === existingNext.id);
    months[nextIdx].carryForward = statement.finalBalances;
  }

  await writeMonths(months);
  return NextResponse.json(months[idx]);
}
