import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { errorResponse, requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** Admin: ativa / desativa uma conta. Não permite desativar contas admin. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const me = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const is_active = !!body?.is_active;

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
        { error: 'Contas de administrador não podem ser desativadas por aqui.' },
        { status: 400 },
      );
    }
    if (target.id === me.id) {
      return NextResponse.json({ error: 'Você não pode alterar a própria conta.' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('accounts')
      .update({ is_active })
      .eq('id', params.id)
      .select('id,email,role,is_active,created_at')
      .single();
    if (error) throw error;

    return NextResponse.json({ account: data });
  } catch (e) {
    return errorResponse(e, 'Erro ao atualizar a conta.');
  }
}
