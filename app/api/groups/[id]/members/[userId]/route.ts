import { NextRequest, NextResponse } from 'next/server';
import { readGroups, writeGroups } from '@/lib/data';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const requesterId = req.headers.get('x-user-id')!;
  const groups = await readGroups();
  const idx = groups.findIndex((g) => g.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if (groups[idx].createdBy !== requesterId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (groups[idx].createdBy === params.userId) {
    return NextResponse.json({ error: 'Cannot remove group creator' }, { status: 400 });
  }

  groups[idx].memberIds = groups[idx].memberIds.filter((id) => id !== params.userId);
  await writeGroups(groups);
  return NextResponse.json({ ok: true });
}
