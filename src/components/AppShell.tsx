'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TapeRuler from './TapeRuler';
import { IconChart, IconDoc, IconGear, IconList, IconRuler, IconShield } from './icons';
import { apiGet } from '@/lib/api';

const NAV = [
  { href: '/', label: 'Lançamentos', Icon: IconList, exact: true },
  { href: '/extrato', label: 'Extrato', Icon: IconDoc, exact: false },
  { href: '/graficos', label: 'Gráficos', Icon: IconChart, exact: false },
  { href: '/configuracoes', label: 'Config.', Icon: IconGear, exact: false },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [me, setMe] = useState<{ email: string; role: 'user' | 'admin' } | null>(null);

  useEffect(() => {
    apiGet<{ email: string; role: 'user' | 'admin' }>('/api/me')
      .then(setMe)
      .catch(() => {});
  }, []);

  return (
    <>
      <header className="appHeader">
        <div className="bar">
          <IconRuler width={28} height={28} />
          <div className="wordmark">
            <span className="mk">Vistorias</span>
            <span className="sub">valores a receber</span>
          </div>
          {me?.role === 'admin' && (
            <Link
              href="/admin"
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                border: '1.5px solid var(--ink)',
                borderRadius: 'var(--radius)',
                padding: '5px 9px',
                color: 'var(--ink)',
                background: 'var(--tape)',
              }}
            >
              <IconShield width={15} height={15} /> Admin
            </Link>
          )}
        </div>
        <TapeRuler />
      </header>

      <main className="container">{children}</main>

      <nav className="bnav">
        {NAV.map(({ href, label, Icon, exact }) => {
          const active = exact ? path === href : path === href || path.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={active ? 'active' : undefined}>
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
