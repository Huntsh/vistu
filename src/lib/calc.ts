import type { Settings, Status } from './types';

export const DEFAULT_SETTINGS: Settings = {
  valor_base_realizada: 60,
  valor_adicional_mobiliado: 60,
  valor_nao_realizada: 30,
  area_limite: 150,
  valor_por_m2: 2,
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Regra de cálculo do valor a receber:
 *  - "Desmarcada com antecedência" -> 0
 *  - "Não realizada"               -> valor_nao_realizada (fixo)
 *  - "Realizada":
 *      area <= area_limite  -> valor_base_realizada (+ valor_adicional_mobiliado se mobiliado)
 *      area >  area_limite  -> area * valor_por_m2
 */
export function calcValor(
  status: Status,
  areaM2: number,
  mobiliado: boolean,
  s: Settings,
): number {
  if (status === 'desmarcada') return 0;
  if (status === 'nao_realizada') return round2(s.valor_nao_realizada);

  const area = Number.isFinite(areaM2) && areaM2 > 0 ? areaM2 : 0;
  if (area > s.area_limite) {
    return round2(area * s.valor_por_m2);
  }
  return round2(s.valor_base_realizada + (mobiliado ? s.valor_adicional_mobiliado : 0));
}
