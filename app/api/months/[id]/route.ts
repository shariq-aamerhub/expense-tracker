import { NextRequest, NextResponse } from 'next/server';
import { readMonths, readGroups } from '@/lib/data';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;
  const months = await readMonths();
  const month = months.find((m) => m.id === params.id);
  if (!month) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const groups = await readGroups();
  const group = groups.find((g) => g.id === month.groupId);
  if (!group?.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json(month);
}
