'use client';

import { useEffect, useState } from 'react';
import ExtratoView from '@/components/ExtratoView';
import { apiGet } from '@/lib/api';

export default function ExtratoPage() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    apiGet<{ email: string }>('/api/me')
      .then((d) => setEmail(d.email || ''))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="pageTitle">Extrato</div>
      <div className="pageSub">Vistorias por período — com exportação em PDF</div>
      <ExtratoView fetchBase="/api/inspections" contaEmail={email} />
    </div>
  );
}
