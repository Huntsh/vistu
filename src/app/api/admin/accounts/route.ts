import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { round2 } from '@/lib/calc';
import { errorResponse, requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const sb = getSupabase();

    const { data: accounts, error } = await sb
      .from('accounts')
      .select('id,email,name,role,is_active,created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;

    const { data: insp, error: e2 } = await sb.from('inspections').select('account_id,valor');
    if (e2) throw e2;

    const agg = new Map<string, { count: number; total: number }>();
    for (const r of insp ?? []) {
      const key = String((r as any).account_id);
      const a = agg.get(key) ?? { count: 0, total: 0 };
      a.count += 1;
      a.total += Number((r as any).valor) || 0;
      agg.set(key, a);
    }

    const rows = (accounts ?? []).map((a) => ({
      ...a,
      inspections: agg.get(a.id)?.count ?? 0,
      total_receber: round2(agg.get(a.id)?.total ?? 0),
    }));

    return NextResponse.json({ accounts: rows });
  } catch (e) {
    return errorResponse(e, 'Erro ao listar contas.');
  }
}
