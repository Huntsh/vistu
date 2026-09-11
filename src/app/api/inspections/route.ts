import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { loadSettings, mapInspection, parseInspectionInput } from '@/lib/db';
import { calcValor } from '@/lib/calc';
import { errorResponse, requireAccount } from '@/lib/session';

export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  try {
    const acc = await requireAccount(req);
    const { searchParams } = new URL(req.url);
    const imobiliaria = searchParams.get('imobiliaria')?.trim();
    const status = searchParams.get('status')?.trim();
    const from = searchParams.get('from')?.trim();
    const to = searchParams.get('to')?.trim();

    const sb = getSupabase();
    let q = sb
      .from('inspections')
      .select('*')
      .eq('account_id', acc.id)
      .order('data_vistoria', { ascending: false })
      .order('hora_vistoria', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (imobiliaria) q = q.eq('imobiliaria', imobiliaria);
    if (status) q = q.eq('status', status);
    if (from && ISO_DATE.test(from)) q = q.gte('data_vistoria', from);
    if (to && ISO_DATE.test(to)) q = q.lte('data_vistoria', to);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ inspections: (data ?? []).map(mapInspection) });
  } catch (e) {
    return errorResponse(e, 'Erro ao listar vistorias.');
  }
}

export async function POST(req: Request) {
  let acc;
  try {
    acc = await requireAccount(req);
  } catch (e) {
    return errorResponse(e);
  }

  let input;
  try {
    input = parseInspectionInput(await req.json().catch(() => ({})));
  } catch (msg) {
    return NextResponse.json({ error: String(msg) }, { status: 400 });
  }

  try {
    const settings = await loadSettings(acc.id);
    const valor = calcValor(input.status, input.area_m2, input.mobiliado, settings);

    const sb = getSupabase();
    const { data, error } = await sb
      .from('inspections')
      .insert({ ...input, valor, account_id: acc.id })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ inspection: mapInspection(data) }, { status: 201 });
  } catch (e) {
    return errorResponse(e, 'Erro ao salvar vistoria.');
  }
}
