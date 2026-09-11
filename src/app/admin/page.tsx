'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import type { AccountSummary } from '@/lib/types';
import { apiGet, apiSend } from '@/lib/api';
import { formatBRL, formatDateBR } from '@/lib/format';

export default function AdminHomePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    setErr('');
    try {
      const d = await apiGet<{ accounts: AccountSummary[] }>('/api/admin/accounts');
      setAccounts(d.accounts);
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar contas.');
      setAccounts([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(a: AccountSummary) {
    setBusyId(a.id);
    setErr('');
    try {
      await apiSend(`/api/admin/accounts/${a.id}/active`, 'PATCH', { is_active: !a.is_active });
      setAccounts((prev) =>
        prev ? prev.map((x) => (x.id === a.id ? { ...x, is_active: !a.is_active } : x)) : prev,
      );
    } catch (e: any) {
      setErr(e?.message || 'Erro ao atualizar a conta.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setErr('');
    try {
      await apiSend(`/api/admin/accounts/${id}`, 'DELETE');
      setConfirmId(null);
      setAccounts((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
    } catch (e: any) {
      setErr(e?.message || 'Erro ao excluir a conta.');
    } finally {
      setBusyId(null);
    }
  }

  const totalGeral = (accounts ?? []).reduce((s, a) => s + a.total_receber, 0);

  return (
    <div>
      <div className="pageTitle">Contas</div>
      <div className="pageSub">Todas as contas do sistema e o total a receber de cada uma</div>

      {err && <div className="error">{err}</div>}

      <div className="summary">
        <div className="stat">
          <div className="k">Contas</div>
          <div className="v">{accounts?.length ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="k">Ativas</div>
          <div className="v">{accounts ? accounts.filter((a) => a.is_active).length : '—'}</div>
        </div>
        <div className="stat total">
          <div className="k">Total a receber (todas)</div>
          <div className="v">{formatBRL(totalGeral)}</div>
        </div>
      </div>

      {accounts === null ? (
        <div className="empty">
          <span className="spin" /> Carregando…
        </div>
      ) : accounts.length === 0 ? (
        <div className="empty">Nenhuma conta ainda.</div>
      ) : (
        <div className="table-wrap">
          <div className="table adminAccounts">
            <div className="thead">
              <span>E-mail</span>
              <span>Papel</span>
              <span>Status</span>
              <span>Vistorias</span>
              <span>A receber</span>
              <span>Criada</span>
              <span>Ações</span>
            </div>

            {accounts.map((a) => (
              <div className="tr" key={a.id}>
                <span className="c">
                  <span className="cl">E-mail</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={a.name} email={a.email} size={24} />
                    <span>
                      {a.name && <strong>{a.name}</strong>}
                      {a.name ? <span className="muted"> — {a.email}</span> : a.email}
                    </span>
                  </span>
                </span>
                <span className="c">
                  <span className="cl">Papel</span>
                  <span>{a.role === 'admin' ? 'Admin' : 'Usuário'}</span>
                </span>
                <span className="c">
                  <span className="cl">Status</span>
                  <span className={a.is_active ? 'pos' : 'neg'}>
                    {a.is_active ? 'Ativa' : 'Desativada'}
                  </span>
                </span>
                <span className="c">
                  <span className="cl">Vistorias</span>
                  <span className="mono">{a.inspections}</span>
                </span>
                <span className="c">
                  <span className="cl">A receber</span>
                  <span className="mono">{formatBRL(a.total_receber)}</span>
                </span>
                <span className="c">
                  <span className="cl">Criada</span>
                  <span className="mono">{formatDateBR(a.created_at.slice(0, 10))}</span>
                </span>

                {confirmId === a.id ? (
                  <span className="confirmRow c">
                    <span>Excluir esta conta e todas as vistorias dela?</span>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => setConfirmId(null)}
                      disabled={busyId === a.id}
                    >
                      Não
                    </button>
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={() => remove(a.id)}
                      disabled={busyId === a.id}
                    >
                      {busyId === a.id ? <span className="spin" /> : 'Excluir'}
                    </button>
                  </span>
                ) : (
                  <span className="c rowact">
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => router.push(`/admin/contas/${a.id}`)}
                    >
                      Abrir
                    </button>
                    {a.role !== 'admin' && (
                      <>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => toggleActive(a)}
                          disabled={busyId === a.id}
                        >
                          {busyId === a.id ? (
                            <span className="spin" />
                          ) : a.is_active ? (
                            'Desativar'
                          ) : (
                            'Ativar'
                          )}
                        </button>
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => setConfirmId(a.id)}
                          disabled={busyId === a.id}
                        >
                          Excluir
                        </button>
                      </>
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
