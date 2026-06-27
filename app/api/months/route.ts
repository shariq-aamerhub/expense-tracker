import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readMonths, writeMonths, readGroups } from '@/lib/data';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');

  const [months, groups] = await Promise.all([readMonths(), readGroups()]);
  const myGroupIds = groups.filter((g) => g.memberIds.includes(userId)).map((g) => g.id);

  let filtered = months.filter((m) => myGroupIds.includes(m.groupId));
  if (groupId) filtered = filtered.filter((m) => m.groupId === groupId);

  return NextResponse.json(filtered.sort((a, b) => b.month.localeCompare(a.month)));
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  try {
    const { groupId, month } = await req.json();
    if (!groupId || !month) return NextResponse.json({ error: 'groupId and month required' }, { status: 400 });

    const groups = await readGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group?.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const months = await readMonths();
    if (months.find((m) => m.groupId === groupId && m.month === month)) {
      return NextResponse.json({ error: 'Month already exists' }, { status: 409 });
    }

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
    return NextResponse.json(newMonth, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
