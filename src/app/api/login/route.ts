import { NextResponse } from 'next/server';
import { AUTH_COOKIE, makeToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password : '';

  const expected = process.env.APP_PASSWORD ?? '';
  if (!expected || !process.env.AUTH_SECRET) {
    return NextResponse.json(
      { error: 'Servidor sem APP_PASSWORD / AUTH_SECRET configurados.' },
      { status: 500 },
    );
  }
  if (password !== expected) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await makeToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
