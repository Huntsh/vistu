'use client';

import { useEffect, useMemo, useState } from 'react';
import Avatar from '@/components/Avatar';
import { apiGet, apiSend } from '@/lib/api';
import { calcValor, DEFAULT_SETTINGS } from '@/lib/calc';
import type { Inspection, Settings } from '@/lib/types';
import { formatBRL, parseNumberBR, toInputNumber } from '@/lib/format';

type FormState = Record<keyof Settings, string>;

const FIELDS: { key: keyof Settings; label: string; hint: string; prefix?: string; suffix?: string }[] = [
  {
    key: 'valor_base_realizada',
    label: 'Valor base — Realizada (até o limite de área)',
    hint: 'Cobrado quando a vistoria é realizada e a área não passa do limite.',
    prefix: 'R$',
  },
  {
    key: 'valor_adicional_mobiliado',
    label: 'Adicional — imóvel mobiliado',
    hint: 'Somado ao valor base quando o imóvel está mobiliado (só até o limite de área).',
    prefix: 'R$',
  },
  {
    key: 'valor_nao_realizada',
    label: 'Valor — Não realizada',
    hint: 'Valor fixo quando o status é “Não realizada”.',
    prefix: 'R$',
  },
  {
    key: 'area_limite',
    label: 'Limite de área',
    hint: 'Acima deste valor, o cálculo passa a ser por m².',
    suffix: 'm²',
  },
  {
    key: 'valor_por_m2',
    label: 'Valor por m² (acima do limite)',
    hint: 'Multiplicado pela área quando ela passa do limite.',
    prefix: 'R$',
  },
];

function toForm(s: Settings): FormState {
  return {
    valor_base_realizada: toInputNumber(s.valor_base_realizada),
    valor_adicional_mobiliado: toInputNumber(s.valor_adicional_mobiliado),
    valor_nao_realizada: toInputNumber(s.valor_nao_realizada),
    area_limite: toInputNumber(s.area_limite),
    valor_por_m2: toInputNumber(s.valor_por_m2),
  };
}

export default function ConfiguracoesPage() {
  // ── Perfil (nome + avatar) ──────────────────────────────────────────────
  const [me, setMe] = useState<{ email: string; role: 'user' | 'admin'; name: string | null } | null>(
    null,
  );
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  useEffect(() => {
    apiGet<{ email: string; role: 'user' | 'admin'; name: string | null }>('/api/me')
      .then((d) => {
        setMe(d);
        setNameInput(d.name ?? '');
      })
      .catch(() => {});
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');
    setSavingName(true);
    try {
      const d = await apiSend<{ email: string; role: 'user' | 'admin'; name: string | null }>(
        '/api/me',
        'PATCH',
        { name: nameInput },
      );
      setMe(d);
      setProfileMsg('Nome salvo.');
    } catch (e: any) {
      setProfileErr(e?.message || 'Erro ao salvar o nome.');
    } finally {
      setSavingName(false);
    }
  }

  // ── Tabela de preços (já existia) ───────────────────────────────────────
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const [confirmRecalc, setConfirmRecalc] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    apiGet<{ settings: Settings }>('/api/settings')
      .then((d) => setForm(toForm(d.settings)))
      .catch((e) => {
        setErr(e?.message || 'Erro ao carregar.');
        setForm(toForm(DEFAULT_SETTINGS));
      });
  }, []);

  const parsed: Settings | null = useMemo(() => {
    if (!form) return null;
    return {
      valor_base_realizada: parseNumberBR(form.valor_base_realizada),
      valor_adicional_mobiliado: parseNumberBR(form.valor_adicional_mobiliado),
      valor_nao_realizada: parseNumberBR(form.valor_nao_realizada),
      area_limite: parseNumberBR(form.area_limite),
      valor_por_m2: parseNumberBR(form.valor_por_m2),
    };
  }, [form]);

  const examples = useMemo(() => {
    if (!parsed) return [];
    return [
      { d: `Realizada · 120 m² · sem móveis`, v: calcValor('realizada', 120, false, parsed) },
      { d: `Realizada · 120 m² · mobiliado`, v: calcValor('realizada', 120, true, parsed) },
      { d: `Realizada · 200 m²`, v: calcValor('realizada', 200, false, parsed) },
      { d: `Não realizada`, v: calcValor('nao_realizada', 0, false, parsed) },
      { d: `Desmarcada com antecedência`, v: calcValor('desmarcada', 0, false, parsed) },
    ];
  }, [parsed]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed) return;
    setErr('');
    setMsg('');

    for (const f of FIELDS) {
      const n = parsed[f.key];
      if (!Number.isFinite(n) || n < 0) {
        setErr(`Valor inválido em “${f.label}”.`);
        return;
      }
    }
    if (parsed.area_limite <= 0) {
      setErr('O limite de área deve ser maior que zero.');
      return;
    }

    setSaving(true);
    try {
      const d = await apiSend<{ settings: Settings }>('/api/settings', 'PUT', parsed);
      setForm(toForm(d.settings));
      setMsg('Tabela de preços salva.');
    } catch (e: any) {
      setErr(e?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function recalc() {
    setErr('');
    setMsg('');
    setRecalcing(true);
    try {
      const d = await apiSend<{ updated: number }>('/api/settings/recalc', 'POST');
      setMsg(`Recalculado: ${d.updated} lançamento(s) atualizados com a tabela atual.`);
      setConfirmRecalc(false);
    } catch (e: any) {
      setErr(e?.message || 'Erro ao recalcular.');
    } finally {
      setRecalcing(false);
    }
  }

  // ── Apagar lançamentos por período ──────────────────────────────────────
  const [clearFrom, setClearFrom] = useState('');
  const [clearTo, setClearTo] = useState('');
  const [clearCount, setClearCount] = useState<number | null>(null);
  const [checkingClear, setCheckingClear] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearMsg, setClearMsg] = useState('');
  const [clearErr, setClearErr] = useState('');

  async function checkClear() {
    setClearErr('');
    setClearMsg('');
    setClearCount(null);
    setConfirmClear(false);
    if (!clearFrom || !clearTo) {
      setClearErr('Escolha as duas datas (de/até).');
      return;
    }
    setCheckingClear(true);
    try {
      const d = await apiGet<{ inspections: Inspection[] }>(
        `/api/inspections?from=${clearFrom}&to=${clearTo}`,
      );
      setClearCount(d.inspections.length);
    } catch (e: any) {
      setClearErr(e?.message || 'Erro ao verificar o período.');
    } finally {
      setCheckingClear(false);
    }
  }

  async function doClear() {
    setClearErr('');
    setClearing(true);
    try {
      const d = await apiSend<{ deleted: number }>(
        `/api/inspections?from=${clearFrom}&to=${clearTo}`,
        'DELETE',
      );
      setClearMsg(`${d.deleted} lançamento(s) apagado(s).`);
      setClearCount(null);
      setConfirmClear(false);
    } catch (e: any) {
      setClearErr(e?.message || 'Erro ao apagar os lançamentos.');
    } finally {
      setClearing(false);
    }
  }

  // ── Excluir a própria conta ─────────────────────────────────────────────
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  async function deleteAccount() {
    if (!me) return;
    setDeleteErr('');
    setDeleting(true);
    try {
      await apiSend('/api/account', 'DELETE');
      window.location.href = '/login';
    } catch (e: any) {
      setDeleteErr(e?.message || 'Erro ao excluir a conta.');
      setDeleting(false);
    }
  }

  if (!form) {
    return (
      <div>
        <div className="pageTitle">Configurações</div>
        <div className="empty">
          <span className="spin" /> Carregando…
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pageTitle">Configurações</div>
      <div className="pageSub">Perfil, tabela de preços e gestão dos seus dados</div>

      <div className="sectionTitle">Seu perfil</div>
      <div className="panel">
        {profileErr && <div className="error">{profileErr}</div>}
        {profileMsg && <div className="notice">{profileMsg}</div>}
        <form onSubmit={saveName} style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Avatar name={me?.name ?? nameInput} email={me?.email ?? ''} size={48} />
          <div className="field" style={{ flex: '1 1 220px', margin: 0 }}>
            <label htmlFor="perfilNome">Nome</label>
            <input
              id="perfilNome"
              className="input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Como quer aparecer no extrato/PDF"
              maxLength={80}
              autoComplete="name"
            />
            <span className="hint">
              {me?.email}
              {me?.role === 'admin' ? ' · Administrador' : ''}
            </span>
          </div>
          <button type="submit" className="btn btn--primary btn--sm" disabled={savingName}>
            {savingName ? <span className="spin" /> : 'Salvar nome'}
          </button>
        </form>
      </div>

      <div className="sectionTitle">Tabela de preços</div>
      <form onSubmit={save}>
        <div className="panel">
          {err && <div className="error">{err}</div>}
          {msg && <div className="notice">{msg}</div>}
          {FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={f.key}>{f.label}</label>
              <div className="inputSuffix">
                <input
                  id={f.key}
                  className="input mono"
                  inputMode="decimal"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  autoComplete="off"
                />
                <span>{f.suffix ?? f.prefix ?? ''}</span>
              </div>
              <span className="hint">{f.hint}</span>
            </div>
          ))}

          <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
            {saving ? <span className="spin" /> : 'Salvar tabela de preços'}
          </button>
        </div>
      </form>

      <div className="sectionTitle">Simulação com estes valores</div>
      <div className="panel">
        {examples.map((ex) => (
          <div
            key={ex.d}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              padding: '7px 0',
              borderBottom: '1px solid var(--line)',
              fontSize: 13,
            }}
          >
            <span className="muted">{ex.d}</span>
            <span className="mono" style={{ fontWeight: 700 }}>
              {formatBRL(ex.v)}
            </span>
          </div>
        ))}
      </div>

      <div className="sectionTitle">Lançamentos já existentes</div>
      <div className="panel">
        <p style={{ marginTop: 0, fontSize: 13 }} className="muted">
          Por padrão, cada lançamento guarda o valor calculado no momento em que foi salvo — mudar a
          tabela de preços <strong>não</strong> altera os antigos. Se quiser aplicar a tabela atual a
          todos os lançamentos já registrados, use o botão abaixo.
        </p>
        {confirmRecalc ? (
          <div className="confirmRow" style={{ justifyContent: 'flex-start' }}>
            <span>Recalcular todos os lançamentos?</span>
            <button className="btn btn--ghost btn--sm" onClick={() => setConfirmRecalc(false)} disabled={recalcing}>
              Cancelar
            </button>
            <button className="btn btn--blue btn--sm" onClick={recalc} disabled={recalcing}>
              {recalcing ? <span className="spin" /> : 'Sim, recalcular'}
            </button>
          </div>
        ) : (
          <button className="btn btn--ghost btn--block" onClick={() => setConfirmRecalc(true)}>
            Recalcular lançamentos com a tabela atual
          </button>
        )}
      </div>

      <div className="sectionTitle">Apagar lançamentos por período</div>
      <div className="panel">
        <p style={{ marginTop: 0, fontSize: 13 }} className="muted">
          Apaga só as vistorias lançadas dentro do período escolhido. Não afeta a tabela de preços
          nem outras datas.
        </p>
        {clearErr && <div className="error">{clearErr}</div>}
        {clearMsg && <div className="notice">{clearMsg}</div>}

        <div className="form-grid two">
          <div className="field">
            <label htmlFor="clearFrom">De</label>
            <input
              id="clearFrom"
              type="date"
              className="input"
              value={clearFrom}
              max={clearTo || undefined}
              onChange={(e) => {
                setClearFrom(e.target.value);
                setClearCount(null);
                setConfirmClear(false);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="clearTo">Até</label>
            <input
              id="clearTo"
              type="date"
              className="input"
              value={clearTo}
              min={clearFrom || undefined}
              onChange={(e) => {
                setClearTo(e.target.value);
                setClearCount(null);
                setConfirmClear(false);
              }}
            />
          </div>
        </div>

        {clearCount === null ? (
          <button
            className="btn btn--ghost btn--block"
            onClick={checkClear}
            disabled={checkingClear || !clearFrom || !clearTo}
          >
            {checkingClear ? <span className="spin" /> : 'Ver quantos serão apagados'}
          </button>
        ) : clearCount === 0 ? (
          <div className="empty">Nenhum lançamento nesse período.</div>
        ) : confirmClear ? (
          <div className="confirmRow" style={{ justifyContent: 'flex-start' }}>
            <span>Apagar {clearCount} lançamento(s) desse período? Não tem como desfazer.</span>
            <button className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(false)} disabled={clearing}>
              Cancelar
            </button>
            <button className="btn btn--danger btn--sm" onClick={doClear} disabled={clearing}>
              {clearing ? <span className="spin" /> : 'Sim, apagar'}
            </button>
          </div>
        ) : (
          <button className="btn btn--danger btn--block" onClick={() => setConfirmClear(true)}>
            Apagar {clearCount} lançamento(s) desse período
          </button>
        )}
      </div>

      {me && me.role !== 'admin' && (
        <>
          <div className="sectionTitle">Excluir minha conta</div>
          <div className="panel" style={{ borderColor: 'var(--bad)' }}>
            <p style={{ marginTop: 0, fontSize: 13 }} className="muted">
              Apaga sua conta, login, tabela de preços e <strong>todas as suas vistorias</strong> —
              para sempre, sem como desfazer. Para confirmar, digite seu e-mail (
              <strong>{me.email}</strong>) abaixo.
            </p>
            {deleteErr && <div className="error">{deleteErr}</div>}
            <div className="field">
              <label htmlFor="delEmail">Seu e-mail</label>
              <input
                id="delEmail"
                className="input"
                value={deleteEmailInput}
                onChange={(e) => setDeleteEmailInput(e.target.value)}
                placeholder={me.email}
                autoComplete="off"
                autoCapitalize="none"
              />
            </div>
            <button
              className="btn btn--danger btn--block"
              onClick={deleteAccount}
              disabled={deleting || deleteEmailInput.trim().toLowerCase() !== me.email.toLowerCase()}
            >
              {deleting ? <span className="spin" /> : 'Excluir minha conta definitivamente'}
            </button>
          </div>
        </>
      )}

      <button
        className="btn btn--ghost btn--block"
        style={{ marginTop: 8 }}
        onClick={async () => {
          await apiSend('/api/logout', 'POST').catch(() => {});
          window.location.href = '/login';
        }}
      >
        Sair
      </button>
    </div>
  );
}
