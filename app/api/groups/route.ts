import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readGroups, writeGroups, readUsers } from '@/lib/data';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  const groups = await readGroups();
  const myGroups = groups.filter((g) => g.memberIds.includes(userId));
  return NextResponse.json(myGroups);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!;
  try {
    const { name, memberIds = [] } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Group name required' }, { status: 400 });

    const users = await readUsers();
    const allMemberIds = Array.from(new Set([userId, ...memberIds]));

    for (const mid of allMemberIds) {
      if (!users.find((u) => u.id === mid)) {
        return NextResponse.json({ error: `User ${mid} not found` }, { status: 400 });
      }
    }

    const group = {
      id: uuidv4(),
      name: name.trim(),
      memberIds: allMemberIds,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    const groups = await readGroups();
    await writeGroups([...groups, group]);
    return NextResponse.json(group, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
