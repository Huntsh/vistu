'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiGet } from '@/lib/api';
import type { Inspection } from '@/lib/types';
import { withinPeriod, type Period } from '@/lib/aggregate';

const ChartsPanel = dynamic(() => import('@/components/ChartsPanel'), {
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

export default function GraficosPage() {
  const [items, setItems] = useState<Inspection[] | null>(null);
  const [period, setPeriod] = useState<Period>(30);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiGet<{ inspections: Inspection[] }>('/api/inspections')
      .then((d) => setItems(d.inspections))
      .catch((e) => {
        setErr(e?.message || 'Erro ao carregar.');
        setItems([]);
      });
  }, []);

  const filtered = useMemo(
    () => (items ? withinPeriod(items, period) : []),
    [items, period],
  );

  return (
    <div>
      <div className="pageTitle">Gráficos</div>
      <div className="pageSub">Produtividade e valores</div>

      {err && <div className="error">{err}</div>}

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

      {items === null ? (
        <div className="empty">
          <span className="spin" /> Carregando…
        </div>
      ) : (
        <ChartsPanel items={filtered} />
      )}
    </div>
  );
}
