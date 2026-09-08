const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function formatBRL(n: number): string {
  return brl.format(Number.isFinite(n) ? n : 0);
}

export function formatArea(n: number): string {
  return `${num.format(Number.isFinite(n) ? n : 0)} m²`;
}

export function formatNum(n: number): string {
  return num.format(Number.isFinite(n) ? n : 0);
}

/** "2025-03-08" -> "08/03/2025" */
export function formatDateBR(iso: string): string {
  if (!iso || iso.length < 10) return iso || '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** "2025-03-08" -> "08/03" */
export function formatDayMonth(iso: string): string {
  if (!iso || iso.length < 10) return iso || '';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Aceita "1.234,56", "1234,56" ou "1234.56" e devolve number. */
export function parseNumberBR(v: string | number): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim();
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** number -> string com vírgula, para preencher inputs. */
export function toInputNumber(n: number): string {
  if (!Number.isFinite(n)) return '';
  return String(n).replace('.', ',');
}

/** Data de hoje no fuso local, como "YYYY-MM-DD". */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
