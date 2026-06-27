import { NextRequest, NextResponse } from 'next/server';
import { readUsers, readGroups, readExpenses, readSettlements, readMonths } from '@/lib/data';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [users, groups, expenses, settlements, months] = await Promise.all([
    readUsers(),
    readGroups(),
    readExpenses(),
    readSettlements(),
    readMonths(),
  ]);

  const bundle = {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: { users, groups, expenses, settlements, months },
  };

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
