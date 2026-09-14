/**
 * bomExportDocument.js — Task M: "Export BOM" PDF (NOT the PO Generator).
 * Fully separate from poDocument.js / poGate.js — different output, different
 * button, different screen. Layout follows the reference purchase-list template:
 * header block, numbered displayOrder table, category roll-up, grand total.
 *
 * Missing-price rule (same as PO): a genuinely missing unitCost renders TBD on
 * that row, and the row is excluded from its category subtotal and the grand
 * total. Never zero-filled, never inferred. Explicit 0 is a stated price.
 */
import { jsPDF } from 'jspdf';
import { isMissingPrice } from './poDocument.js';

const money = (n) => Math.round(Number(n) * 100) / 100;

export const formatMoney = (n) => `RM ${money(n).toFixed(2)}`;

/** Stable presentation order: displayOrder ascending, legacy nulls last. */
export const byDisplayOrder = (rows) =>
  [...(rows || [])].sort((a, b) => {
    const x = typeof a.displayOrder === 'number' ? a.displayOrder : Number.MAX_SAFE_INTEGER;
    const y = typeof b.displayOrder === 'number' ? b.displayOrder : Number.MAX_SAFE_INTEGER;
    return x - y;
  });

/** One export row per BomItem, numbered from 1 in displayOrder. */
export const buildBomExportLines = (bomItems) =>
  byDisplayOrder(bomItems).map((b, i) => {
    const missing = isMissingPrice(b.purchaseQty) || isMissingPrice(b.unitCost);
    return {
      no: i + 1,
      category: b.category ?? 'Uncategorised',
      description: b.item ?? '(unnamed)',
      unit: b.unit ?? null,
      qty: isMissingPrice(b.purchaseQty) ? null : Number(b.purchaseQty),
      unitCost: isMissingPrice(b.unitCost) ? null : Number(b.unitCost),
      lineTotal: missing ? null : money(Number(b.purchaseQty) * Number(b.unitCost)),
      notes: b.spec ?? null,
    };
  });

/** Per-category roll-up. lineCount covers all rows; subtotal covers priced rows only. */
export const buildCategoryRollup = (lines) => {
  const map = new Map();
  for (const l of lines || []) {
    if (!map.has(l.category)) map.set(l.category, { category: l.category, lineCount: 0, subtotal: 0 });
    const r = map.get(l.category);
    r.lineCount += 1;
    if (l.lineTotal !== null) r.subtotal = money(r.subtotal + l.lineTotal);
  }
  return [...map.values()];
};

export const buildBomExportTotals = (lines) => {
  const priced = (lines || []).filter((l) => l.lineTotal !== null);
  return {
    grandTotal: money(priced.reduce((s, l) => s + l.lineTotal, 0)),
    itemCount: (lines || []).length,
    tbdCount: (lines || []).length - priced.length,
  };
};

/**
 * Assemble everything the PDF needs. clientLine is '—' when unset (graceful
 * blank); quotationDate/source are caller-provided (unknown → honest defaults).
 */
export const buildBomExportData = ({ project, quotationDate, source, generatedAt, lines }) => {
  const rollup = buildCategoryRollup(lines);
  const { grandTotal, itemCount, tbdCount } = buildBomExportTotals(lines);
  return {
    title: 'DSG B - PURCHASE LIST',
    projectName: (project && project.name) || 'UNKNOWN PROJECT',
    location: (project && project.location) || null,
    clientLine: project && project.client ? project.client : '—',
    quotationDate: quotationDate || '—',
    source: source || 'Agent 6/7 Reconciliation Pipeline',
    generatedAt,
    lines: lines || [],
    rollup,
    grandTotal,
    itemCount,
    tbdCount,
  };
};

/**
 * Render the export PDF. ASCII body text, compression off (deterministic,
 * byte-searchable). The em-dash in the template's Client blank is rendered as
 * '-' for font safety; the data layer still carries '—'.
 */
export const renderBomExportPdf = (data) => {
  const doc = new jsPDF({ compress: false });
  let y = 20;
  const next = (step = 7) => {
    y += step;
    if (y > 280) { doc.addPage(); y = 20; }
  };

  doc.setFontSize(16);
  doc.text(data.title, 14, y);
  next(8);
  doc.setFontSize(11);
  doc.text(`Project: ${data.projectName}${data.location ? `, ${data.location}` : ''}`, 14, y);
  next();
  doc.text(`Client: ${data.clientLine === '—' ? '-' : data.clientLine}`, 14, y);
  next();
  doc.text(`Quotation Date: ${data.quotationDate}`, 14, y);
  next();
  doc.text(`Source: ${data.source}`, 14, y);
  next();
  doc.text(`Generated: ${data.generatedAt}`, 14, y);
  next(10);

  doc.setFontSize(10);
  doc.text('# | Category | Item Description | Unit | Qty | Unit Cost (RM) | Line Total (RM) | Notes/Spec', 14, y);
  next();
  for (const l of data.lines) {
    const row = `${l.no} | ${l.category} | ${l.description} | ${l.unit || '-'} | ` +
      `${l.qty === null ? 'TBD' : l.qty} | ` +
      `${l.unitCost === null ? 'TBD' : formatMoney(l.unitCost)} | ` +
      `${l.lineTotal === null ? 'TBD' : formatMoney(l.lineTotal)} | ${l.notes || '-'}`;
    doc.text(row, 14, y);
    next(6);
  }

  next(4);
  doc.setFontSize(11);
  doc.text('--- Category Roll-Up ---', 14, y);
  next();
  doc.setFontSize(10);
  for (const r of data.rollup) {
    doc.text(`${r.category} | ${r.lineCount} | ${formatMoney(r.subtotal)}`, 14, y);
    next(6);
  }
  next(4);
  doc.setFontSize(12);
  doc.text(`GRAND TOTAL | ${data.itemCount} | ${formatMoney(data.grandTotal)}`, 14, y);
  if (data.tbdCount > 0) {
    next(8);
    doc.setFontSize(10);
    doc.text(`${data.tbdCount} line(s) TBD - excluded from subtotals and grand total.`, 14, y);
  }
  return doc.output('arraybuffer');
};

export default {
  byDisplayOrder,
  buildBomExportLines,
  buildCategoryRollup,
  buildBomExportTotals,
  buildBomExportData,
  renderBomExportPdf,
  formatMoney,
};
