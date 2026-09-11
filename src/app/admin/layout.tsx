import Link from 'next/link';
import { IconShield } from '@/components/icons';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="appHeader">
        <div className="bar">
          <IconShield width={26} height={26} />
          <div className="wordmark">
            <span className="mk">Painel Admin</span>
            <span className="sub">contas &amp; vistorias</span>
          </div>
          <Link
            href="/"
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              border: '1.5px solid var(--line-strong)',
              borderRadius: 'var(--radius)',
              padding: '5px 9px',
              color: 'var(--ink)',
            }}
          >
            ← Voltar ao app
          </Link>
        </div>
      </header>
      <main className="container wide" style={{ paddingBottom: 48 }}>
        {children}
      </main>
    </>
  );
}
