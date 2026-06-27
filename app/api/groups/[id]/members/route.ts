import { NextRequest, NextResponse } from 'next/server';
import { readGroups, writeGroups, readUsers } from '@/lib/data';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;
  const groups = await readGroups();
  const idx = groups.findIndex((g) => g.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if (!groups[idx].memberIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const users = await readUsers();
  const newMember = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!newMember) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (groups[idx].memberIds.includes(newMember.id)) {
    return NextResponse.json({ error: 'User already in group' }, { status: 409 });
  }

  groups[idx].memberIds.push(newMember.id);
  await writeGroups(groups);
  return NextResponse.json({ id: newMember.id, name: newMember.name, email: newMember.email });
}
