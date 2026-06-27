import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface JwtPayload {
  userId: string;
  email: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export function getAuthUser(req: NextRequest): JwtPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}
