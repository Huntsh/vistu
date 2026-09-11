'use client';

import { useState } from 'react';
import Link from 'next/link';
import TapeRuler from '@/components/TapeRuler';
import { apiSend } from '@/lib/api';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (password.length < 6) {
      setErr('A senha precisa de pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setErr('As senhas não conferem.');
      return;
    }
    setLoading(true);
    try {
      await apiSend('/api/signup', 'POST', { email, name, password });
      window.location.href = '/';
    } catch (e: any) {
      setErr(e?.message || 'Não foi possível criar a conta.');
      setLoading(false);
    }
  }

  return (
    <div className="loginWrap">
      <div className="loginCard">
        <TapeRuler count={6} />
        <div className="body">
          <div className="mk">Criar conta</div>
          <div className="sub">vistorias a receber</div>

          {err && <div className="error">{err}</div>}

          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                required
              />
            </div>
            <div className="field">
              <label htmlFor="name">Nome (opcional)</label>
              <input
                id="name"
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={80}
              />
            </div>
            <div className="field">
              <label htmlFor="pw">Senha</label>
              <input
                id="pw"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="pw2">Confirmar senha</label>
              <input
                id="pw2"
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
              {loading ? <span className="spin" /> : 'Criar conta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }} className="muted">
            Já tem conta? <Link href="/login">Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
