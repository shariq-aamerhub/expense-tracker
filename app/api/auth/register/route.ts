import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readUsers, writeUsers } from '@/lib/data';
import { hashPassword, signJwt, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const users = await readUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = { id: uuidv4(), name, email: email.toLowerCase(), passwordHash, createdAt: new Date().toISOString() };
    await writeUsers([...users, user]);

    const token = signJwt({ userId: user.id, email: user.email });
    const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
    setAuthCookie(res, token);
    return res;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
