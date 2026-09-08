'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Inspection, Settings, Status } from '@/lib/types';
import { STATUS_LABEL, STATUS_LIST } from '@/lib/types';
import { calcValor } from '@/lib/calc';
import { apiSend } from '@/lib/api';
import { formatBRL, parseNumberBR, toInputNumber, todayISO } from '@/lib/format';

const SEG_CLASS: Record<Status, string> = {
  realizada: 'ok',
  nao_realizada: 'warn',
  desmarcada: 'bad',
};

export default function InspectionForm({
  initial,
  settings,
  imobiliarias,
}: {
  initial?: Inspection;
  settings: Settings;
  imobiliarias: string[];
}) {
  const router = useRouter();
  const editing = !!initial;

  const [numRegistro, setNumRegistro] = useState(initial?.num_registro ?? '');
  const [numContrato, setNumContrato] = useState(initial?.num_contrato ?? '');
  const [imobiliaria, setImobiliaria] = useState(initial?.imobiliaria ?? '');
  const [area, setArea] = useState(initial ? toInputNumber(initial.area_m2) : '');
  const [mobiliado, setMobiliado] = useState<boolean>(initial?.mobiliado ?? false);
  const [data, setData] = useState(initial?.data_vistoria ?? todayISO());
  const [hora, setHora] = useState(initial?.hora_vistoria ?? '');
  const [status, setStatus] = useState<Status>(initial?.status ?? 'realizada');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const areaNum = parseNumberBR(area);
  const valor = useMemo(
    () => calcValor(status, areaNum, mobiliado, settings),
    [status, areaNum, mobiliado, settings],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    if (!numRegistro.trim()) return setErr('Informe o nº de registro.');
    if (!imobiliaria.trim()) return setErr('Informe a imobiliária.');
    if (!data) return setErr('Informe a data da vistoria.');

    setSaving(true);
    const payload = {
      num_registro: numRegistro.trim(),
      num_contrato: numContrato.trim() || null,
      imobiliaria: imobiliaria.trim(),
      area_m2: areaNum,
      mobiliado,
      data_vistoria: data,
      hora_vistoria: hora || null,
      status,
    };

    try {
      if (editing) {
        await apiSend(`/api/inspections/${initial!.id}`, 'PATCH', payload);
      } else {
        await apiSend('/api/inspections', 'POST', payload);
      }
      router.push('/');
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'Erro ao salvar.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {err && <div className="error">{err}</div>}

      <div className="form-grid two">
        <div className="field">
          <label htmlFor="reg">Nº de registro</label>
          <input
            id="reg"
            className="input"
            value={numRegistro}
            onChange={(e) => setNumRegistro(e.target.value)}
            inputMode="text"
            autoComplete="off"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="contr">Nº do contrato</label>
          <input
            id="contr"
            className="input"
            value={numContrato}
            onChange={(e) => setNumContrato(e.target.value)}
            inputMode="text"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="imob">Imobiliária</label>
        <input
          id="imob"
          className="input"
          list="imob-list"
          value={imobiliaria}
          onChange={(e) => setImobiliaria(e.target.value)}
          autoComplete="off"
          placeholder="Digite ou escolha uma já cadastrada"
          required
        />
        <datalist id="imob-list">
          {imobiliarias.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="field">
        <label htmlFor="area">Área do imóvel</label>
        <div className="inputSuffix">
          <input
            id="area"
            className="input mono"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            autoComplete="off"
          />
          <span>m²</span>
        </div>
      </div>

      <div className="field">
        <label>Imóvel mobiliado</label>
        <div className="seg h">
          <button
            type="button"
            className="segbtn"
            aria-pressed={!mobiliado}
            onClick={() => setMobiliado(false)}
          >
            Não
          </button>
          <button
            type="button"
            className="segbtn ok"
            aria-pressed={mobiliado}
            onClick={() => setMobiliado(true)}
          >
            Sim
          </button>
        </div>
      </div>

      <div className="form-grid two">
        <div className="field">
          <label htmlFor="data">Data da vistoria</label>
          <input
            id="data"
            type="date"
            className="input mono"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="hora">Horário</label>
          <input
            id="hora"
            type="time"
            className="input mono"
            value={hora ?? ''}
            onChange={(e) => setHora(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label>Status da vistoria</label>
        <div className="seg">
          {STATUS_LIST.map((s) => (
            <button
              key={s}
              type="button"
              className={`segbtn ${SEG_CLASS[s]}`}
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="valuePreview">
        <span className="k">Valor a receber</span>
        <span className="v">{formatBRL(valor)}</span>
      </div>

      <div className="btnRow">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => router.push('/')}
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? <span className="spin" /> : editing ? 'Salvar alterações' : 'Salvar vistoria'}
        </button>
      </div>
    </form>
  );
}
