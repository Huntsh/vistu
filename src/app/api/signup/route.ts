import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { AUTH_COOKIE, SESSION_TTL_SECONDS, hashPassword, signSession } from '@/lib/auth';
import { DEFAULT_SETTINGS } from '@/lib/calc';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normEmail(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = normEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!process.env.AUTH_SECRET) {
    return NextResponse.json({ error: 'Servidor sem AUTH_SECRET configurado.' }, { status: 500 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'A senha precisa de pelo menos 6 caracteres.' },
      { status: 400 },
    );
  }

  try {
    const sb = getSupabase();

    const { data: existing } = await sb
      .from('accounts')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Já existe uma conta com esse e-mail.' }, { status: 409 });
    }

    const password_hash = await hashPassword(password);
    const { data: acc, error } = await sb
      .from('accounts')
      .insert({ email, password_hash, role: 'user', is_active: true })
      .select('*')
      .single();
    if (error) {
      if ((error as any).code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma conta com esse e-mail.' },
          { status: 409 },
        );
      }
      throw error;
    }

    await sb
      .from('app_settings')
      .insert({ account_id: acc.id, ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() });

    const token = await signSession({ sub: acc.id, role: acc.role, email: acc.email });
    const res = NextResponse.json({ ok: true, role: acc.role });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao criar conta.' }, { status: 500 });
  }
}
