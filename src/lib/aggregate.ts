import type { Inspection, Status } from './types';
import { round2 } from './calc';
import { formatDayMonth } from './format';

export type Period = 7 | 30 | 90 | 0; // 0 = tudo

export function withinPeriod(items: Inspection[], days: Period): Inspection[] {
  if (!days) return items;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const off = cutoff.getTimezoneOffset() * 60000;
  const c = new Date(cutoff.getTime() - off).toISOString().slice(0, 10);
  return items.filter((i) => i.data_vistoria >= c);
}

function byDay<T>(items: Inspection[], pick: (acc: T, i: Inspection) => T, seed: () => T): { dia: string; label: string; v: T }[] {
  const m = new Map<string, T>();
  for (const i of items) {
    m.set(i.data_vistoria, pick(m.get(i.data_vistoria) ?? seed(), i));
  }
  return [...m.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([dia, v]) => ({ dia, label: formatDayMonth(dia), v }));
}

export function valorPorDia(items: Inspection[]) {
  return byDay<number>(items, (acc, i) => acc + i.valor, () => 0).map((r) => ({
    label: r.label,
    valor: round2(r.v),
  }));
}

export function realizadasPorDia(items: Inspection[]) {
  return byDay<number>(
    items,
    (acc, i) => acc + (i.status === 'realizada' ? 1 : 0),
    () => 0,
  ).map((r) => ({ label: r.label, qtd: r.v }));
}

export function porStatus(items: Inspection[]) {
  const c: Record<Status, number> = { realizada: 0, nao_realizada: 0, desmarcada: 0 };
  for (const i of items) c[i.status]++;
  return [
    { key: 'realizada' as Status, name: 'Realizadas', value: c.realizada },
    { key: 'nao_realizada' as Status, name: 'Não realizadas', value: c.nao_realizada },
    { key: 'desmarcada' as Status, name: 'Desmarcadas', value: c.desmarcada },
  ].filter((d) => d.value > 0);
}

export function porImobiliaria(items: Inspection[], limit = 8) {
  const m = new Map<string, number>();
  for (const i of items) m.set(i.imobiliaria, (m.get(i.imobiliaria) ?? 0) + i.valor);
  return [...m.entries()]
    .map(([imob, valor]) => ({ imob, valor: round2(valor) }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limit);
}

export interface Totals {
  realizada: number;
  nao_realizada: number;
  desmarcada: number;
  valorTotal: number;
  count: number;
}

export function totals(items: Inspection[]): Totals {
  const t: Totals = { realizada: 0, nao_realizada: 0, desmarcada: 0, valorTotal: 0, count: items.length };
  for (const i of items) {
    t[i.status]++;
    t.valorTotal += i.valor;
  }
  t.valorTotal = round2(t.valorTotal);
  return t;
}
