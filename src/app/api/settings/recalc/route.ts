import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { loadSettings } from '@/lib/db';
import { calcValor } from '@/lib/calc';
import { errorResponse, requireAccount } from '@/lib/session';
import type { Status } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Recalcula o valor de TODOS os lançamentos DA CONTA com a tabela de preços atual. */
export async function POST(req: Request) {
  try {
    const acc = await requireAccount(req);
    const settings = await loadSettings(acc.id);
    const sb = getSupabase();

    const { data, error } = await sb.from('inspections').select('*').eq('account_id', acc.id);
    if (error) throw error;

    const rows = (data ?? []).map((r: any) => ({
      ...r,
      valor: calcValor(r.status as Status, Number(r.area_m2) || 0, !!r.mobiliado, settings),
    }));

    let updated = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      if (!chunk.length) continue;
      const { error: upErr } = await sb.from('inspections').upsert(chunk, { onConflict: 'id' });
      if (upErr) throw upErr;
      updated += chunk.length;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    return errorResponse(e, 'Erro ao recalcular.');
  }
}
