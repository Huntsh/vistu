'use client';

import { useEffect, useState } from 'react';
import InspectionForm from '@/components/InspectionForm';
import { apiGet } from '@/lib/api';
import { DEFAULT_SETTINGS } from '@/lib/calc';
import type { Settings } from '@/lib/types';

export default function NovaPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [imobiliarias, setImobiliarias] = useState<string[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      apiGet<{ settings: Settings }>('/api/settings'),
      apiGet<{ imobiliarias: string[] }>('/api/imobiliarias'),
    ])
      .then(([a, b]) => {
        setSettings(a.settings);
        setImobiliarias(b.imobiliarias);
      })
      .catch((e) => {
        setErr(e?.message || 'Erro ao carregar.');
        setSettings(DEFAULT_SETTINGS);
      });
  }, []);

  return (
    <div>
      <div className="pageTitle">Nova vistoria</div>
      <div className="pageSub">Lance uma vistoria realizada</div>

      {err && <div className="error">{err}</div>}

      {settings ? (
        <InspectionForm settings={settings} imobiliarias={imobiliarias} />
      ) : (
        <div className="empty">
          <span className="spin" /> Carregando…
        </div>
      )}
    </div>
  );
}
