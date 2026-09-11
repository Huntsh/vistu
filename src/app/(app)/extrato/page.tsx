'use client';

import { useEffect, useState } from 'react';
import ExtratoView from '@/components/ExtratoView';
import { apiGet } from '@/lib/api';

export default function ExtratoPage() {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ email: string; name: string | null }>('/api/me')
      .then((d) => {
        setEmail(d.email || '');
        setNome(d.name ?? null);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="pageTitle">Extrato</div>
      <div className="pageSub">Vistorias por período — com exportação em PDF</div>
      <ExtratoView fetchBase="/api/inspections" contaEmail={email} contaNome={nome} />
    </div>
  );
}
