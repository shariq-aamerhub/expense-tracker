import { NextRequest, NextResponse } from 'next/server';
import { writeUsers, writeGroups, writeExpenses, writeSettlements, writeMonths } from '@/lib/data';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let bundle: any;
  try {
    bundle = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!bundle?.data) {
    return NextResponse.json({ error: 'Invalid backup file — missing data field' }, { status: 400 });
  }

  const { users, groups, expenses, settlements, months } = bundle.data;

  if (!Array.isArray(users) || !Array.isArray(groups) || !Array.isArray(expenses) ||
      !Array.isArray(settlements) || !Array.isArray(months)) {
    return NextResponse.json({ error: 'Invalid backup file — one or more collections are missing or not arrays' }, { status: 400 });
  }

  await Promise.all([
    writeUsers(users),
    writeGroups(groups),
    writeExpenses(expenses),
    writeSettlements(settlements),
    writeMonths(months),
  ]);

  return NextResponse.json({
    ok: true,
    restored: {
      users: users.length,
      groups: groups.length,
      expenses: expenses.length,
      settlements: settlements.length,
      months: months.length,
    },
  });
}
