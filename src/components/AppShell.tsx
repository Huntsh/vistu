'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TapeRuler from './TapeRuler';
import { IconChart, IconGear, IconList, IconRuler } from './icons';

const NAV = [
  { href: '/', label: 'Lançamentos', Icon: IconList, exact: true },
  { href: '/graficos', label: 'Gráficos', Icon: IconChart, exact: false },
  { href: '/configuracoes', label: 'Configurações', Icon: IconGear, exact: false },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <>
      <header className="appHeader">
        <div className="bar">
          <IconRuler width={28} height={28} />
          <div className="wordmark">
            <span className="mk">Vistorias</span>
            <span className="sub">valores a receber</span>
          </div>
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
