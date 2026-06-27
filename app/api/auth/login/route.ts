import { NextRequest, NextResponse } from 'next/server';
import { readUsers } from '@/lib/data';
import { verifyPassword, signJwt, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const users = await readUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signJwt({ userId: user.id, email: user.email });
    const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
    setAuthCookie(res, token);
    return res;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
