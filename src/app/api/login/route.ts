import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import {
  AUTH_COOKIE,
  SESSION_TTL_SECONDS,
  hashPassword,
  signSession,
  verifyPassword,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

function normEmail(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

/**
 * Na primeira vez que alguém tenta entrar e a tabela `accounts` está vazia,
 * cria a conta de administrador a partir de ADMIN_EMAIL + APP_PASSWORD.
 */
async function ensureAdminBootstrap(sb: SupabaseClient) {
  const adminEmail = normEmail(process.env.ADMIN_EMAIL);
  const adminPassword = process.env.APP_PASSWORD ?? '';
  if (!adminEmail || !adminPassword) return;

  const { count, error } = await sb
    .from('accounts')
    .select('id', { count: 'exact', head: true });
  if (error || (count ?? 0) > 0) return;

  const password_hash = await hashPassword(adminPassword);
  await sb
    .from('accounts')
    .insert({ email: adminEmail, password_hash, role: 'admin', is_active: true });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = normEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!process.env.AUTH_SECRET) {
    return NextResponse.json({ error: 'Servidor sem AUTH_SECRET configurado.' }, { status: 500 });
  }
  if (!email || !password) {
    return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });
  }

  try {
    const sb = getSupabase();
    await ensureAdminBootstrap(sb);

    const { data: acc, error } = await sb
      .from('accounts')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;

    if (!acc || !(await verifyPassword(password, acc.password_hash))) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }
    if (!acc.is_active) {
      return NextResponse.json(
        { error: 'Conta desativada. Fale com o administrador.' },
        { status: 403 },
      );
    }

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
    return NextResponse.json({ error: e?.message || 'Erro ao entrar.' }, { status: 500 });
  }
}
