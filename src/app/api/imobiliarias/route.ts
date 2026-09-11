import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { errorResponse, requireAccount } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const acc = await requireAccount(req);
    const sb = getSupabase();
    const { data, error } = await sb
      .from('inspections')
      .select('imobiliaria')
      .eq('account_id', acc.id);
    if (error) throw error;

    const seen = new Map<string, string>();
    for (const row of data ?? []) {
      const name = String((row as { imobiliaria: string }).imobiliaria ?? '').trim();
      if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
    }
    const imobiliarias = [...seen.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return NextResponse.json({ imobiliarias });
  } catch (e) {
    return errorResponse(e, 'Erro ao carregar imobiliárias.');
  }
}
