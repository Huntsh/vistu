import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { loadSettings, mapInspection, parseInspectionInput } from '@/lib/db';
import { calcValor } from '@/lib/calc';
import { errorResponse, requireAccount } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const acc = await requireAccount(req);
    const sb = getSupabase();
    const { data, error } = await sb
      .from('inspections')
      .select('*')
      .eq('id', params.id)
      .eq('account_id', acc.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Vistoria não encontrada.' }, { status: 404 });
    return NextResponse.json({ inspection: mapInspection(data) });
  } catch (e) {
    return errorResponse(e, 'Erro ao carregar vistoria.');
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
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
      .update({ ...input, valor })
      .eq('id', params.id)
      .eq('account_id', acc.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Vistoria não encontrada.' }, { status: 404 });

    return NextResponse.json({ inspection: mapInspection(data) });
  } catch (e) {
    return errorResponse(e, 'Erro ao atualizar vistoria.');
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const acc = await requireAccount(req);
    const sb = getSupabase();
    const { error } = await sb
      .from('inspections')
      .delete()
      .eq('id', params.id)
      .eq('account_id', acc.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, 'Erro ao remover vistoria.');
  }
}
