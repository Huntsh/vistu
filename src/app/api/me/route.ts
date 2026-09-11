import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { errorResponse, requireAccount } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const acc = await requireAccount(req);
    const sb = getSupabase();
    const { data, error } = await sb
      .from('accounts')
      .select('name')
      .eq('id', acc.id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ email: acc.email, role: acc.role, name: data?.name ?? null });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Atualiza o nome da própria conta (mostrado no avatar e no PDF). */
export async function PATCH(req: Request) {
  try {
    const acc = await requireAccount(req);
    const body = await req.json().catch(() => ({}));
    let name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (name.length > 80) {
      return NextResponse.json({ error: 'Nome muito longo (máx. 80 caracteres).' }, { status: 400 });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('accounts')
      .update({ name: name || null })
      .eq('id', acc.id)
      .select('name')
      .single();
    if (error) throw error;

    return NextResponse.json({ email: acc.email, role: acc.role, name: data.name ?? null });
  } catch (e) {
    return errorResponse(e, 'Erro ao salvar o nome.');
  }
}
