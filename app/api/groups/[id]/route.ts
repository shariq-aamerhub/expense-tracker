import { NextRequest, NextResponse } from 'next/server';
import { readGroups, writeGroups, readUsers, readExpenses } from '@/lib/data';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;
  const groups = await readGroups();
  const group = groups.find((g) => g.id === params.id);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if (!group.memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await readUsers();
  const members = users
    .filter((u) => group.memberIds.includes(u.id))
    .map(({ id, name, email }) => ({ id, name, email }));

  return NextResponse.json({ ...group, members });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;
  const groups = await readGroups();
  const idx = groups.findIndex((g) => g.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if (groups[idx].createdBy !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name } = await req.json();
  if (name) groups[idx].name = name.trim();
  await writeGroups(groups);
  return NextResponse.json(groups[idx]);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;
  const groups = await readGroups();
  const group = groups.find((g) => g.id === params.id);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if (group.createdBy !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const expenses = await readExpenses();
  if (expenses.some((e) => e.groupId === params.id)) {
    return NextResponse.json({ error: 'Cannot delete group with existing expenses' }, { status: 400 });
  }

  await writeGroups(groups.filter((g) => g.id !== params.id));
  return NextResponse.json({ ok: true });
}
