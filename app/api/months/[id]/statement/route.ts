import { NextRequest, NextResponse } from 'next/server';
import { readMonths, readGroups, readExpenses, readSettlements, readUsers } from '@/lib/data';
import { calculateMonthStatement } from '@/lib/calculations';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;

  const months = await readMonths();
  const monthRecord = months.find((m) => m.id === params.id);
  if (!monthRecord) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const groups = await readGroups();
  const group = groups.find((g) => g.id === monthRecord.groupId);
  if (!group?.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { groupId, month } = monthRecord;
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
    monthRecord.carryForward,
    month,
    groupId,
    monthRecord.status
  );

  return NextResponse.json({ ...statement, members: members.map(({ id, name, email }) => ({ id, name, email })) });
}
