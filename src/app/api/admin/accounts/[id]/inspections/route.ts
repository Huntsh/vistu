import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { loadSettings, mapInspection } from '@/lib/db';
import { errorResponse, requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Ctx = { params: { id: string } };

/** Admin: lançamentos de uma conta específica (somente leitura). Aceita from/to. */
export async function GET(req: Request, { params }: Ctx) {
  try {
    await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const imobiliaria = searchParams.get('imobiliaria')?.trim();
    const status = searchParams.get('status')?.trim();
    const from = searchParams.get('from')?.trim();
    const to = searchParams.get('to')?.trim();

    const sb = getSupabase();

    const { data: acc, error: accErr } = await sb
      .from('accounts')
      .select('id,email,role,is_active,created_at')
      .eq('id', params.id)
      .maybeSingle();
    if (accErr) throw accErr;
    if (!acc) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });

    let q = sb
      .from('inspections')
      .select('*')
      .eq('account_id', params.id)
      .order('data_vistoria', { ascending: false })
      .order('hora_vistoria', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (imobiliaria) q = q.eq('imobiliaria', imobiliaria);
    if (status) q = q.eq('status', status);
    if (from && ISO_DATE.test(from)) q = q.gte('data_vistoria', from);
    if (to && ISO_DATE.test(to)) q = q.lte('data_vistoria', to);

    const { data, error } = await q;
    if (error) throw error;

    const settings = await loadSettings(params.id);

    return NextResponse.json({
      account: acc,
      settings,
      inspections: (data ?? []).map(mapInspection),
    });
  } catch (e) {
    return errorResponse(e, 'Erro ao carregar lançamentos da conta.');
  }
}
