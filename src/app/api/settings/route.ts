import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { loadSettings, mapSettings } from '@/lib/db';
import { errorResponse, requireAccount } from '@/lib/session';
import type { Settings } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FIELDS: (keyof Settings)[] = [
  'valor_base_realizada',
  'valor_adicional_mobiliado',
  'valor_nao_realizada',
  'area_limite',
  'valor_por_m2',
];

export async function GET(req: Request) {
  try {
    const acc = await requireAccount(req);
    return NextResponse.json({ settings: await loadSettings(acc.id) });
  } catch (e) {
    return errorResponse(e, 'Erro ao carregar configurações.');
  }
}

export async function PUT(req: Request) {
  let acc;
  try {
    acc = await requireAccount(req);
  } catch (e) {
    return errorResponse(e);
  }

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, number> = {};

  for (const f of FIELDS) {
    const n = Number(body?.[f]);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: `Valor inválido para "${f}".` }, { status: 400 });
    }
    patch[f] = Math.round(n * 100) / 100;
  }
  if (patch.area_limite <= 0) {
    return NextResponse.json({ error: 'O limite de área deve ser maior que zero.' }, { status: 400 });
  }

  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('app_settings')
      .upsert(
        { account_id: acc.id, ...patch, updated_at: new Date().toISOString() },
        { onConflict: 'account_id' },
      )
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ settings: mapSettings(data) });
  } catch (e) {
    return errorResponse(e, 'Erro ao salvar configurações.');
  }
}
