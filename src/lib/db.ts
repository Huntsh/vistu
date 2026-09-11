import { getSupabase } from './supabase';
import { DEFAULT_SETTINGS } from './calc';
import type { Inspection, Settings, Status } from './types';

export function mapSettings(row: Record<string, unknown> | null | undefined): Settings {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    valor_base_realizada: Number(row.valor_base_realizada),
    valor_adicional_mobiliado: Number(row.valor_adicional_mobiliado),
    valor_nao_realizada: Number(row.valor_nao_realizada),
    area_limite: Number(row.area_limite),
    valor_por_m2: Number(row.valor_por_m2),
  };
}

/**
 * Carrega a tabela de preços da conta. Se ainda não houver linha para a conta,
 * cria uma com os valores padrão e a devolve.
 */
export async function loadSettings(accountId: string): Promise<Settings> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('app_settings')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle();
  if (error) throw error;
  if (data) return mapSettings(data as Record<string, unknown>);

  const seed = { account_id: accountId, ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() };
  const { data: created, error: insErr } = await sb
    .from('app_settings')
    .insert(seed)
    .select('*')
    .maybeSingle();
  if (insErr) {
    // corrida: outra request criou primeiro — relê.
    const { data: again } = await sb
      .from('app_settings')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();
    return mapSettings((again as Record<string, unknown> | null) ?? null);
  }
  return mapSettings(created as Record<string, unknown> | null);
}

export function mapInspection(row: Record<string, any>): Inspection {
  return {
    id: String(row.id),
    num_registro: row.num_registro ?? '',
    num_contrato: row.num_contrato ?? null,
    imobiliaria: row.imobiliaria ?? '',
    area_m2: Number(row.area_m2) || 0,
    mobiliado: !!row.mobiliado,
    data_vistoria: row.data_vistoria,
    hora_vistoria: row.hora_vistoria ?? null,
    status: row.status as Status,
    valor: Number(row.valor) || 0,
    created_at: row.created_at,
  };
}

export interface InspectionInput {
  num_registro: string;
  num_contrato: string | null;
  imobiliaria: string;
  area_m2: number;
  mobiliado: boolean;
  data_vistoria: string;
  hora_vistoria: string | null;
  status: Status;
}

/** Valida e normaliza o corpo recebido da API. Lança string de erro se inválido. */
export function parseInspectionInput(b: any): InspectionInput {
  const status = String(b?.status ?? '');
  if (!['realizada', 'nao_realizada', 'desmarcada'].includes(status)) {
    throw 'Status inválido.';
  }
  const num_registro = String(b?.num_registro ?? '').trim();
  if (!num_registro) throw 'Nº de registro é obrigatório.';

  const imobiliaria = String(b?.imobiliaria ?? '').trim();
  if (!imobiliaria) throw 'Imobiliária é obrigatória.';

  const data_vistoria = String(b?.data_vistoria ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_vistoria)) throw 'Data da vistoria inválida.';

  let area_m2 = Number(b?.area_m2);
  if (!Number.isFinite(area_m2) || area_m2 < 0) area_m2 = 0;

  const num_contrato = b?.num_contrato ? String(b.num_contrato).trim() || null : null;

  let hora_vistoria: string | null = b?.hora_vistoria ? String(b.hora_vistoria).trim() : null;
  if (hora_vistoria) {
    hora_vistoria = hora_vistoria.slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(hora_vistoria)) hora_vistoria = null;
  }

  return {
    num_registro,
    num_contrato,
    imobiliaria,
    area_m2,
    mobiliado: !!b?.mobiliado,
    data_vistoria,
    hora_vistoria,
    status: status as Status,
  };
}
