import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { errorResponse, requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** Admin: exclui outra conta (e, em cascata, suas vistorias). Nunca uma conta admin nem a própria. */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const me = await requireAdmin(req);
    const sb = getSupabase();

    const { data: target, error: findErr } = await sb
      .from('accounts')
      .select('id,role')
      .eq('id', params.id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!target) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });

    if (target.role === 'admin') {
      return NextResponse.json(
        { error: 'Contas de administrador não podem ser excluídas por aqui.' },
        { status: 400 },
      );
    }
    if (target.id === me.id) {
      return NextResponse.json({ error: 'Você não pode excluir a própria conta aqui.' }, { status: 400 });
    }

    const { error } = await sb.from('accounts').delete().eq('id', params.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, 'Erro ao excluir a conta.');
  }
}
