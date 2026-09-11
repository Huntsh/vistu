'use client';

import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { IconDownload } from '@/components/icons';
import type { Inspection, Status } from '@/lib/types';
import { STATUS_LABEL, STATUS_LIST } from '@/lib/types';
import { apiGet } from '@/lib/api';
import { formatBRL, formatDateBR, formatNum, todayISO } from '@/lib/format';
import { totals } from '@/lib/aggregate';
import { buildExtratoPdf } from '@/lib/pdf';

function firstOfMonthISO(): string {
  const t = todayISO();
  return `${t.slice(0, 8)}01`;
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

interface Preset {
  label: string;
  range: () => [string, string];
}

const PRESETS: Preset[] = [
  { label: 'Este mês', range: () => [firstOfMonthISO(), todayISO()] },
  {
    label: 'Mês passado',
    range: () => {
      const first = firstOfMonthISO();
      const lastPrev = addDaysISO(first, -1);
      return [`${lastPrev.slice(0, 8)}01`, lastPrev];
    },
  },
  { label: 'Últimos 30 dias', range: () => [addDaysISO(todayISO(), -29), todayISO()] },
  { label: 'Últimos 90 dias', range: () => [addDaysISO(todayISO(), -89), todayISO()] },
];

export default function ExtratoView({
  fetchBase,
  contaEmail,
  contaNome,
}: {
  fetchBase: string;
  contaEmail: string;
  contaNome?: string | null;
}) {
  const [from, setFrom] = useState(firstOfMonthISO);
  const [to, setTo] = useState(todayISO);
  const [rows, setRows] = useState<Inspection[] | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [gen, setGen] = useState(false);

  const [fImob, setFImob] = useState('');
  const [fStatus, setFStatus] = useState<'' | Status>('');

  async function load(a = from, b = to) {
    setErr('');
    setLoading(true);
    try {
      const sep = fetchBase.includes('?') ? '&' : '?';
      const d = await apiGet<{ inspections: Inspection[] }>(
        `${fetchBase}${sep}from=${a}&to=${b}`,
      );
      setRows(d.inspections);
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBase]);

  const imobOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows ?? []) if (r.imobiliaria) s.add(r.imobiliaria);
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [rows]);

  const filtered = useMemo(() => {
    return (rows ?? []).filter(
      (i) => (!fImob || i.imobiliaria === fImob) && (!fStatus || i.status === fStatus),
    );
  }, [rows, fImob, fStatus]);

  const t = totals(filtered);

  function applyPreset(p: Preset) {
    const [a, b] = p.range();
    setFrom(a);
    setTo(b);
    load(a, b);
  }

  async function baixarPdf() {
    if (!filtered.length) return;
    setGen(true);
    setErr('');
    try {
      await buildExtratoPdf(filtered, {
        contaEmail,
        contaNome,
        from,
        to,
        imobiliaria: fImob || undefined,
        statusLabel: fStatus ? STATUS_LABEL[fStatus] : undefined,
      });
    } catch (e: any) {
      setErr(e?.message || 'Não foi possível gerar o PDF.');
    } finally {
      setGen(false);
    }
  }

  return (
    <div>
      <div className="periodbar">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="segbtn" onClick={() => applyPreset(p)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="filters">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="de">De</label>
          <input
            id="de"
            type="date"
            className="input"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="ate">Até</label>
          <input
            id="ate"
            type="date"
            className="input"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => load()}
          disabled={loading || !from || !to}
        >
          {loading ? <span className="spin" /> : 'Buscar'}
        </button>
      </div>

      <div className="filters">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="ei">Imobiliária</label>
          <select id="ei" className="select" value={fImob} onChange={(e) => setFImob(e.target.value)}>
            <option value="">Todas</option>
            {imobOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="es">Status</label>
          <select
            id="es"
            className="select"
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value as '' | Status)}
          >
            <option value="">Todos</option>
            {STATUS_LIST.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn--blue btn--sm"
          onClick={baixarPdf}
          disabled={gen || loading || filtered.length === 0}
        >
          {gen ? <span className="spin" /> : <IconDownload width={16} height={16} />} PDF
        </button>
      </div>

      {err && <div className="error">{err}</div>}

      <div className="summary">
        <div className="stat ok">
          <div className="k">Realizadas</div>
          <div className="v">{t.realizada}</div>
        </div>
        <div className="stat warn">
          <div className="k">Não realizadas</div>
          <div className="v">{t.nao_realizada}</div>
        </div>
        <div className="stat bad">
          <div className="k">Desmarcadas</div>
          <div className="v">{t.desmarcada}</div>
        </div>
        <div className="stat total">
          <div className="k">Total no período</div>
          <div className="v">{formatBRL(t.valorTotal)}</div>
        </div>
      </div>

      {rows === null ? (
        <div className="empty">
          <span className="spin" /> Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">Nenhuma vistoria nesse período / filtro.</div>
      ) : (
        <div className="table-wrap">
          <div className="table extrato">
            <div className="thead">
              <span>Data</span>
              <span>Hora</span>
              <span>Registro</span>
              <span>Contrato</span>
              <span>Imobiliária</span>
              <span>Área</span>
              <span>Mob.</span>
              <span>Status</span>
              <span>Valor</span>
            </div>

            {filtered.map((i) => (
              <div className="tr" key={i.id}>
                <span className="c">
                  <span className="cl">Data</span>
                  <span className="mono">{formatDateBR(i.data_vistoria)}</span>
                </span>
                <span className="c">
                  <span className="cl">Hora</span>
                  <span className="mono">{i.hora_vistoria || '—'}</span>
                </span>
                <span className="c">
                  <span className="cl">Registro</span>
                  <span className="mono">{i.num_registro}</span>
                </span>
                <span className="c">
                  <span className="cl">Contrato</span>
                  <span className="mono">{i.num_contrato || '—'}</span>
                </span>
                <span className="c">
                  <span className="cl">Imobiliária</span>
                  <span>{i.imobiliaria}</span>
                </span>
                <span className="c">
                  <span className="cl">Área</span>
                  <span className="mono">{formatNum(i.area_m2)} m²</span>
                </span>
                <span className="c">
                  <span className="cl">Mobiliado</span>
                  <span>{i.mobiliado ? 'Sim' : 'Não'}</span>
                </span>
                <span className="c">
                  <span className="cl">Status</span>
                  <StatusBadge status={i.status} short />
                </span>
                <span className="c">
                  <span className="cl">Valor</span>
                  <span className={`val ${i.valor > 0 ? 'pos' : 'zero'}`}>{formatBRL(i.valor)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
