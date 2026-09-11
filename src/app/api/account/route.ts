import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { AUTH_COOKIE } from '@/lib/auth';
import { errorResponse, requireAccount } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Exclui a PRÓPRIA conta (e, em cascata, suas vistorias e tabela de preços). */
export async function DELETE(req: Request) {
  try {
    const acc = await requireAccount(req);
    if (acc.role === 'admin') {
      return NextResponse.json(
        { error: 'Contas de administrador não podem se autoexcluir.' },
        { status: 400 },
      );
    }

    const sb = getSupabase();
    const { error } = await sb.from('accounts').delete().eq('id', acc.id);
    if (error) throw error;

    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) {
    return errorResponse(e, 'Erro ao excluir a conta.');
  }
}
