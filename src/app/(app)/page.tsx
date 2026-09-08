'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import { IconEdit, IconPlus, IconTrash } from '@/components/icons';
import type { Inspection, Status } from '@/lib/types';
import { STATUS_LABEL, STATUS_LIST } from '@/lib/types';
import { apiGet, apiSend } from '@/lib/api';
import { formatBRL, formatDateBR, formatNum } from '@/lib/format';
import { totals } from '@/lib/aggregate';

export default function LancamentosPage() {
  const router = useRouter();
  const [items, setItems] = useState<Inspection[] | null>(null);
  const [imobiliarias, setImobiliarias] = useState<string[]>([]);
  const [err, setErr] = useState('');

  const [fImob, setFImob] = useState('');
  const [fStatus, setFStatus] = useState<'' | Status>('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setErr('');
    try {
      const [a, b] = await Promise.all([
        apiGet<{ inspections: Inspection[] }>('/api/inspections'),
        apiGet<{ imobiliarias: string[] }>('/api/imobiliarias'),
      ]);
      setItems(a.inspections);
      setImobiliarias(b.imobiliarias);
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar.');
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter(
      (i) => (!fImob || i.imobiliaria === fImob) && (!fStatus || i.status === fStatus),
    );
  }, [items, fImob, fStatus]);

  const t = totals(filtered);
  const hasFilter = !!fImob || !!fStatus;

  async function remove(id: string) {
    setBusyId(id);
    try {
      await apiSend(`/api/inspections/${id}`, 'DELETE');
      setConfirmId(null);
      setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
    } catch (e: any) {
      setErr(e?.message || 'Erro ao remover.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="toolbar">
        <div>
          <div className="pageTitle">Lançamentos</div>
          <div className="pageSub">Vistorias realizadas e valores a receber</div>
        </div>
        <Link href="/nova" className="btn btn--primary">
          <IconPlus width={18} height={18} /> Nova vistoria
        </Link>
      </div>

      {err && <div className="error">{err}</div>}

      <div className="filters">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="fi">Imobiliária</label>
          <select id="fi" className="select" value={fImob} onChange={(e) => setFImob(e.target.value)}>
            <option value="">Todas</option>
            {imobiliarias.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="fs">Status</label>
          <select
            id="fs"
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
          className="btn btn--ghost btn--sm"
          onClick={() => {
            setFImob('');
            setFStatus('');
          }}
          disabled={!hasFilter}
        >
          Limpar filtros
        </button>
      </div>

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
          <div className="k">{hasFilter ? 'Total (filtro)' : 'Total geral a receber'}</div>
          <div className="v">{formatBRL(t.valorTotal)}</div>
        </div>
      </div>

      {items === null ? (
        <div className="empty">
          <span className="spin" /> Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          {items.length === 0
            ? 'Nenhuma vistoria lançada ainda. Toque em “Nova vistoria”.'
            : 'Nenhuma vistoria com esses filtros.'}
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table">
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
              <span>Ações</span>
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

                {confirmId === i.id ? (
                  <span className="confirmRow c">
                    <span>Remover esta vistoria?</span>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => setConfirmId(null)}
                      disabled={busyId === i.id}
                    >
                      Não
                    </button>
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={() => remove(i.id)}
                      disabled={busyId === i.id}
                    >
                      {busyId === i.id ? <span className="spin" /> : 'Remover'}
                    </button>
                  </span>
                ) : (
                  <span className="rowact c">
                    <button
                      className="btn btn--ghost btn--sm"
                      title="Editar"
                      onClick={() => router.push(`/editar/${i.id}`)}
                    >
                      <IconEdit width={15} height={15} />
                    </button>
                    <button
                      className="btn btn--danger btn--sm"
                      title="Remover"
                      onClick={() => setConfirmId(i.id)}
                    >
                      <IconTrash width={15} height={15} />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
