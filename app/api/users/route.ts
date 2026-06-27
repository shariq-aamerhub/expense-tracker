import { NextRequest, NextResponse } from 'next/server';
import { readUsers } from '@/lib/data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  const users = await readUsers();

  if (email) {
    const found = users
      .filter((u) => u.email.toLowerCase().includes(email.toLowerCase()))
      .map(({ id, name, email }) => ({ id, name, email }));
    return NextResponse.json(found);
  }

  return NextResponse.json(users.map(({ id, name, email }) => ({ id, name, email })));
}
