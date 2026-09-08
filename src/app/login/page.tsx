'use client';

import { useState } from 'react';
import TapeRuler from '@/components/TapeRuler';
import { apiSend } from '@/lib/api';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await apiSend('/api/login', 'POST', { password });
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      window.location.href = next && next.startsWith('/') ? next : '/';
    } catch (e: any) {
      setErr(e?.message || 'Não foi possível entrar.');
      setLoading(false);
    }
  }

  return (
    <div className="loginWrap">
      <div className="loginCard">
        <TapeRuler count={6} />
        <div className="body">
          <div className="mk">Vistorias</div>
          <div className="sub">valores a receber</div>

          {err && <div className="error">{err}</div>}

          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="pw">Senha de acesso</label>
              <input
                id="pw"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>
            <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
              {loading ? <span className="spin" /> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
