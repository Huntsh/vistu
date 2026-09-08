'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { calcValor, DEFAULT_SETTINGS } from '@/lib/calc';
import type { Settings } from '@/lib/types';
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
      <div className="pageSub">Tabela de preços das vistorias</div>

      {err && <div className="error">{err}</div>}
      {msg && <div className="notice">{msg}</div>}

      <form onSubmit={save}>
        <div className="panel">
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
