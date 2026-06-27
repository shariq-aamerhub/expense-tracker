import { NextRequest, NextResponse } from 'next/server';
import { readSettlements, writeSettlements, readGroups, readMonths } from '@/lib/data';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;
  const settlements = await readSettlements();
  const settlement = settlements.find((s) => s.id === params.id);
  if (!settlement) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const groups = await readGroups();
  const group = groups.find((g) => g.id === settlement.groupId);
  if (!group?.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const months = await readMonths();
  const monthRecord = months.find((m) => m.groupId === settlement.groupId && m.month === settlement.month);
  if (monthRecord?.status === 'closed') {
    return NextResponse.json({ error: 'Month is closed' }, { status: 400 });
  }

  await writeSettlements(settlements.filter((s) => s.id !== params.id));
  return NextResponse.json({ ok: true });
}
