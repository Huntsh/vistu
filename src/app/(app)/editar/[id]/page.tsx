'use client';

import { useEffect, useState } from 'react';
import InspectionForm from '@/components/InspectionForm';
import { apiGet } from '@/lib/api';
import type { Inspection, Settings } from '@/lib/types';

export default function EditarPage({ params }: { params: { id: string } }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [imobiliarias, setImobiliarias] = useState<string[]>([]);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      apiGet<{ settings: Settings }>('/api/settings'),
      apiGet<{ imobiliarias: string[] }>('/api/imobiliarias'),
      apiGet<{ inspection: Inspection }>(`/api/inspections/${params.id}`),
    ])
      .then(([a, b, c]) => {
        setSettings(a.settings);
        setImobiliarias(b.imobiliarias);
        setInspection(c.inspection);
      })
      .catch((e) => setErr(e?.message || 'Erro ao carregar a vistoria.'));
  }, [params.id]);

  return (
    <div>
      <div className="pageTitle">Editar vistoria</div>
      <div className="pageSub">Altere os dados e salve</div>

      {err && <div className="error">{err}</div>}

      {settings && inspection ? (
        <InspectionForm initial={inspection} settings={settings} imobiliarias={imobiliarias} />
      ) : (
        !err && (
          <div className="empty">
            <span className="spin" /> Carregando…
          </div>
        )
      )}
    </div>
  );
}
