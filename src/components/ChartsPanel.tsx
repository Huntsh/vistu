'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Inspection, Status } from '@/lib/types';
import { formatBRL } from '@/lib/format';
import {
  porImobiliaria,
  porStatus,
  realizadasPorDia,
  totals,
  valorPorDia,
} from '@/lib/aggregate';

const C = {
  ink: '#23262b',
  tape: '#f4b400',
  blueprint: '#1f5f8b',
  ok: '#2f7d4f',
  warn: '#a86a12',
  bad: '#c8482a',
  line: '#d9d6c4',
};

const STATUS_COLOR: Record<Status, string> = {
  realizada: C.ok,
  nao_realizada: C.warn,
  desmarcada: C.bad,
};

const axis = { fontSize: 10, stroke: '#5c6069' };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="chartCard">
      <div className="cap">{title}</div>
      {children}
    </div>
  );
}

export default function ChartsPanel({ items }: { items: Inspection[] }) {
  if (!items.length) {
    return <div className="empty">Sem vistorias no período selecionado.</div>;
  }

  const t = totals(items);
  const vDia = valorPorDia(items);
  const rDia = realizadasPorDia(items);
  const stat = porStatus(items);
  const imob = porImobiliaria(items);

  return (
    <div>
      <div className="summary">
        <div className="stat ok">
          <div className="k">Realizadas</div>
          <div className="v">{t.realizada}</div>
        </div>
        <div className="stat warn">
          <div className="k">Não realizadas</div>
          <div className="v">{t.nao_realizada}</div>
        </div>
        <div className="stat bad">
          <div className="k">Desmarcadas</div>
          <div className="v">{t.desmarcada}</div>
        </div>
        <div className="stat total">
          <div className="k">Total a receber</div>
          <div className="v">{formatBRL(t.valorTotal)}</div>
        </div>
      </div>

      <Card title="Valores a receber por dia">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={vDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={C.line} vertical={false} />
            <XAxis dataKey="label" tick={axis} interval="preserveStartEnd" minTickGap={14} />
            <YAxis tick={axis} width={44} />
            <Tooltip formatter={(v: number) => formatBRL(v)} labelFormatter={(l) => `Dia ${l}`} />
            <Bar dataKey="valor" name="Valor" fill={C.tape} stroke={C.ink} strokeWidth={1} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Vistorias realizadas por dia (produtividade)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={C.line} vertical={false} />
            <XAxis dataKey="label" tick={axis} interval="preserveStartEnd" minTickGap={14} />
            <YAxis tick={axis} width={32} allowDecimals={false} />
            <Tooltip labelFormatter={(l) => `Dia ${l}`} />
            <Line
              type="monotone"
              dataKey="qtd"
              name="Realizadas"
              stroke={C.ok}
              strokeWidth={2.5}
              dot={{ r: 3, fill: C.ok }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Distribuição por status">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={stat}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
              label={(d: any) => `${d.name}: ${d.value}`}
              labelLine={false}
            >
              {stat.map((d) => (
                <Cell key={d.key} fill={STATUS_COLOR[d.key]} stroke={C.ink} strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Valor total por imobiliária (ranking)">
        <ResponsiveContainer width="100%" height={Math.max(160, imob.length * 38 + 20)}>
          <BarChart data={imob} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={C.line} horizontal={false} />
            <XAxis type="number" tick={axis} />
            <YAxis type="category" dataKey="imob" tick={axis} width={96} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            <Bar dataKey="valor" name="Valor" fill={C.blueprint} stroke={C.ink} strokeWidth={1} radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
