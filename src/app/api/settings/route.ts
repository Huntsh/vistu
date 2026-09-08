import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { loadSettings, mapSettings } from '@/lib/db';
import type { Settings } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FIELDS: (keyof Settings)[] = [
  'valor_base_realizada',
  'valor_adicional_mobiliado',
  'valor_nao_realizada',
  'area_limite',
  'valor_por_m2',
];

export async function GET() {
  try {
    return NextResponse.json({ settings: await loadSettings() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao carregar configurações.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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
      .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ settings: mapSettings(data) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao salvar configurações.' }, { status: 500 });
  }
}
