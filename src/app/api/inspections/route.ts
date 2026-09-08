import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { loadSettings, mapInspection, parseInspectionInput } from '@/lib/db';
import { calcValor } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const imobiliaria = searchParams.get('imobiliaria')?.trim();
    const status = searchParams.get('status')?.trim();

    const sb = getSupabase();
    let q = sb
      .from('inspections')
      .select('*')
      .order('data_vistoria', { ascending: false })
      .order('hora_vistoria', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (imobiliaria) q = q.eq('imobiliaria', imobiliaria);
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ inspections: (data ?? []).map(mapInspection) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao listar vistorias.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let input;
  try {
    input = parseInspectionInput(await req.json().catch(() => ({})));
  } catch (msg) {
    return NextResponse.json({ error: String(msg) }, { status: 400 });
  }

  try {
    const settings = await loadSettings();
    const valor = calcValor(input.status, input.area_m2, input.mobiliado, settings);

    const sb = getSupabase();
    const { data, error } = await sb
      .from('inspections')
      .insert({ ...input, valor })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ inspection: mapInspection(data) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao salvar vistoria.' }, { status: 500 });
  }
}
