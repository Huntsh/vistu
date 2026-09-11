// ════════════════════════════════════════════════════════════════════════════
//  Extrato de vistorias em PDF (jsPDF + jspdf-autotable).
//  Import dinâmico para não pesar o bundle inicial. Fonte padrão Helvetica
//  (WinAnsi) cobre acentos e o "R$" com espaço fino da formatação pt-BR.
// ════════════════════════════════════════════════════════════════════════════

import type { Inspection } from './types';
import { STATUS_LABEL_SHORT } from './types';
import { formatBRL, formatDateBR, formatNum } from './format';
import { porImobiliaria, totals } from './aggregate';

export interface ExtratoMeta {
  contaEmail: string;
  contaNome?: string | null;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  imobiliaria?: string;
  statusLabel?: string;
}

export async function buildExtratoPdf(rows: Inspection[], meta: ExtratoMeta): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable: any = (autoTableMod as any).default ?? autoTableMod;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Vistorias a Receber — Extrato', marginX, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const contaLabel = meta.contaNome?.trim()
    ? `${meta.contaNome.trim()} — ${meta.contaEmail || '—'}`
    : meta.contaEmail || '—';
  const info = [
    `Conta: ${contaLabel}`,
    `Período: ${formatDateBR(meta.from)} a ${formatDateBR(meta.to)}`,
  ];
  const filtros: string[] = [];
  if (meta.imobiliaria) filtros.push(`Imobiliária: ${meta.imobiliaria}`);
  if (meta.statusLabel) filtros.push(`Status: ${meta.statusLabel}`);
  if (filtros.length) info.push(filtros.join('   ·   '));
  info.push(`Emitido em: ${new Date().toLocaleString('pt-BR')}`);
  doc.text(info, marginX, 66);

  const t = totals(rows);
  const startY = 66 + info.length * 14 + 10;

  autoTable(doc, {
    startY,
    head: [[
      'Data', 'Hora', 'Registro', 'Contrato', 'Imobiliária', 'Área m²', 'Mob.', 'Status', 'Valor',
    ]],
    body: rows.map((i) => [
      formatDateBR(i.data_vistoria),
      i.hora_vistoria || '—',
      i.num_registro || '—',
      i.num_contrato || '—',
      i.imobiliaria || '—',
      formatNum(i.area_m2),
      i.mobiliado ? 'Sim' : 'Não',
      STATUS_LABEL_SHORT[i.status],
      formatBRL(i.valor),
    ]),
    foot: [[
      { content: `${t.count} vistoria(s)`, colSpan: 8, styles: { halign: 'right' } },
      { content: formatBRL(t.valorTotal), styles: { halign: 'right' } },
    ]],
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [35, 38, 43], textColor: [255, 255, 255], fontSize: 8 },
    footStyles: { fillColor: [244, 180, 0], textColor: [35, 38, 43], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 32 },
      5: { halign: 'right', cellWidth: 42 },
      6: { halign: 'center', cellWidth: 28 },
      7: { cellWidth: 66 },
      8: { halign: 'right', cellWidth: 62 },
    },
    margin: { left: marginX, right: marginX },
  });

  let y = (doc as any).lastAutoTable.finalY + 22;
  if (y > pageH - 120) {
    doc.addPage();
    y = 50;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Resumo do período', marginX, y);

  autoTable(doc, {
    startY: y + 6,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    body: [
      ['Realizadas', String(t.realizada)],
      ['Não realizadas', String(t.nao_realizada)],
      ['Desmarcadas', String(t.desmarcada)],
      ['Total a receber', formatBRL(t.valorTotal)],
    ],
    columnStyles: { 0: { cellWidth: 170 }, 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: marginX, right: marginX },
  });

  const porImob = porImobiliaria(rows, 50);
  if (porImob.length > 1) {
    y = (doc as any).lastAutoTable.finalY + 18;
    if (y > pageH - 100) {
      doc.addPage();
      y = 50;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Por imobiliária', marginX, y);
    autoTable(doc, {
      startY: y + 6,
      head: [['Imobiliária', 'Valor']],
      body: porImob.map((r) => [r.imob, formatBRL(r.valor)]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [31, 95, 139], textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: marginX, right: marginX },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Página ${p} de ${pages}`, pageW - marginX, pageH - 20, { align: 'right' });
  }

  const fname = `extrato-${meta.from}_a_${meta.to}.pdf`;
  try {
    doc.save(fname);
  } catch {
    doc.output('dataurlnewwindow');
  }
}
