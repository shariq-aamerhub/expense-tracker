import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readSettlements, writeSettlements, readGroups, readMonths } from '@/lib/data';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');
  const month = searchParams.get('month');

  const [settlements, groups] = await Promise.all([readSettlements(), readGroups()]);
  const myGroupIds = groups.filter((g) => g.memberIds.includes(userId)).map((g) => g.id);

  let filtered = settlements.filter((s) => myGroupIds.includes(s.groupId));
  if (groupId) filtered = filtered.filter((s) => s.groupId === groupId);
  if (month) filtered = filtered.filter((s) => s.month === month);

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  try {
    const { groupId, month, paidBy, receivedBy, amount, date, note = '' } = await req.json();

    if (!groupId || !month || !paidBy || !receivedBy || amount == null || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (paidBy === receivedBy) return NextResponse.json({ error: 'Payer and receiver must differ' }, { status: 400 });
    if (amount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });

    const groups = await readGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group?.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const months = await readMonths();
    const monthRecord = months.find((m) => m.groupId === groupId && m.month === month);
    if (monthRecord?.status === 'closed') {
      return NextResponse.json({ error: 'Month is closed, cannot add settlement' }, { status: 400 });
    }

    const settlement = {
      id: uuidv4(),
      groupId,
      month,
      paidBy,
      receivedBy,
      amount: Number(amount),
      date,
      note,
      createdAt: new Date().toISOString(),
    };

    const settlements = await readSettlements();
    await writeSettlements([...settlements, settlement]);
    return NextResponse.json(settlement, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
