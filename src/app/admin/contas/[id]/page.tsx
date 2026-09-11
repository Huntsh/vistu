'use client';

import { useEffect, useMemo, useState } from 'react';
import nextDynamic from 'next/dynamic';
import Link from 'next/link';
import ExtratoView from '@/components/ExtratoView';
import type { Account, Inspection } from '@/lib/types';
import { apiGet } from '@/lib/api';
import { withinPeriod, type Period } from '@/lib/aggregate';

const ChartsPanel = nextDynamic(() => import('@/components/ChartsPanel'), {
  ssr: false,
  loading: () => (
    <div className="empty">
      <span className="spin" /> Carregando gráficos…
    </div>
  ),
});

const PERIODS: { v: Period; label: string }[] = [
  { v: 7, label: '7 dias' },
  { v: 30, label: '30 dias' },
  { v: 90, label: '90 dias' },
  { v: 0, label: 'Tudo' },
];

export default function AdminContaPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [account, setAccount] = useState<Account | null>(null);
  const [all, setAll] = useState<Inspection[] | null>(null);
  const [period, setPeriod] = useState<Period>(30);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiGet<{ account: Account; inspections: Inspection[] }>(
      `/api/admin/accounts/${id}/inspections`,
    )
      .then((d) => {
        setAccount(d.account);
        setAll(d.inspections);
      })
      .catch((e) => {
        setErr(e?.message || 'Erro ao carregar a conta.');
        setAll([]);
      });
  }, [id]);

  const forCharts = useMemo(() => (all ? withinPeriod(all, period) : []), [all, period]);

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <Link href="/admin" style={{ fontSize: 13 }}>
          ← Contas
        </Link>
      </div>
      <div className="pageTitle">{account?.email ?? 'Conta'}</div>
      <div className="pageSub">
        {account
          ? `${account.role === 'admin' ? 'Administrador' : 'Usuário'} · ${
              account.is_active ? 'ativa' : 'desativada'
            } · somente leitura`
          : 'Carregando…'}
      </div>

      {err && <div className="error">{err}</div>}

      <div className="sectionTitle">Extrato por período</div>
      <ExtratoView
        fetchBase={`/api/admin/accounts/${id}/inspections`}
        contaEmail={account?.email ?? ''}
      />

      <div className="sectionTitle" style={{ marginTop: 28 }}>
        Gráficos
      </div>
      <div className="periodbar">
        {PERIODS.map((p) => (
          <button
            key={p.v}
            type="button"
            className="segbtn"
            aria-pressed={period === p.v}
            onClick={() => setPeriod(p.v)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {all === null ? (
        <div className="empty">
          <span className="spin" /> Carregando…
        </div>
      ) : (
        <ChartsPanel items={forCharts} />
      )}
    </div>
  );
}
