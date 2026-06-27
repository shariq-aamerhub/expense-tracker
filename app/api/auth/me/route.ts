import { NextRequest, NextResponse } from 'next/server';
import { readUsers } from '@/lib/data';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = await readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
