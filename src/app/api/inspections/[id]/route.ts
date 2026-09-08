import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { loadSettings, mapInspection, parseInspectionInput } from '@/lib/db';
import { calcValor } from '@/lib/calc';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('inspections').select('*').eq('id', params.id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Vistoria não encontrada.' }, { status: 404 });
    return NextResponse.json({ inspection: mapInspection(data) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao carregar vistoria.' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
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
      .update({ ...input, valor })
      .eq('id', params.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Vistoria não encontrada.' }, { status: 404 });

    return NextResponse.json({ inspection: mapInspection(data) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao atualizar vistoria.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('inspections').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao remover vistoria.' }, { status: 500 });
  }
}
