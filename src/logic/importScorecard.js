/**
 * importScorecard.js — Lane 1A: trust pass tooling (pure functions, no DB).
 *
 * An independent recount + per-line comparison of what the SOURCE file contains
 * vs what the parser produced. Catches the real failure modes: silently dropped
 * rows, drifted quantities/prices, mangled totals, duplicate CSV entries.
 * Mirrors the parser's row guards (aggregate rows, numbered-# guard, blank/#
 * item names) so clean fixtures score zero errors — acceptance for this lane.
 *
 * Reuses the readers' own low-level helpers (splitSections, classifySection,
 * isSeparatorRow, XLSX.utils) — the verification shares foundations with the
 * parser but not its typed column logic, so typed-parser bugs still surface.
 *
 * Passive by design: computes + reports. Never blocks, never confirms, never
 * writes (the ImportRun repo call lives in the screens).
 */
import * as XLSX from 'xlsx';
import { splitSections, classifySection, isSeparatorRow } from '../utils/importParser/mdReader.js';
import { linkKey } from './supplierLinking.js';

const H = (s) => String(s ?? '').toLowerCase();

/** Same header normalization as the readers (mirrored, not imported — private there). */
const colFind = (headerRow, patterns) => {
  for (let i = 0; i < headerRow.length; i++) {
    const c = H(headerRow[i]).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!c) continue;
    if (patterns.some((p) => p.test(c))) return i;
  }
  return -1;
};

/** mdReader's aggregate-row guard, mirrored (private there). */
const isAggregateRowText = (t) => /material\s*total|subtotal|^\s*total/i.test(t);

/**
 * normalize.js toNullString null-set, mirrored: a source item name that
 * normalizes to null (blank | NaN | em-dash | dash) is not a BOM item —
 * buildParsedImport filters those rows out, so the recount must too.
 */
const isNullName = (name) =>
  !name || /^nan$/i.test(String(name).trim()) || ['—', '-'].includes(String(name).trim());

const splitRow = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/** Source cell -> number or null. '', 'NaN', non-numeric ('C+E') -> null. */
const srcNum = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === '' || /^nan$/i.test(s) || s === '—' || s === '-') return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Parsed value (number | numeric string | null | '') -> number or null. */
const parsedNum = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const round4 = (n) => Math.round(n * 1e4) / 1e4;

/**
 * Independently extract the Master BOM data rows from raw markdown text.
 * Mirrors mdReader.parseBomTables' guards: true header row located by content
 * (Item + a Qty column), aggregate/note rows stripped, numbered-# guard applied.
 * @returns {{ line: number, no: string, name: string, unit: string, qty: number|null, cost: number|null, total: number|null }[]}
 */
export const extractMdBomSourceRows = (text) => {
  const sections = splitSections(text);
  const rows = [];
  for (const sec of sections) {
    if (classifySection(sec.header) !== 'bom') continue;
    const lines = sec.lines;
    let i = 0;
    while (i < lines.length) {
      if (!lines[i].trim().startsWith('|')) { i++; continue; }
      const block = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        block.push({ text: lines[i].trim(), line: i + 1 }); // 1-based row ordinal in file
        i++;
      }
      if (block.length < 2) continue;
      const entries = block.map((b) => ({ ...b, row: splitRow(b.text) }));
      const nonSepIdx = entries.map((e, k) => ({ e, k })).filter(({ e }) => !isSeparatorRow(e.row));
      if (nonSepIdx.length === 0) continue;
      // Header: carries Item + a Qty-like column (same content match as the reader).
      const hi = nonSepIdx.findIndex(({ e }) =>
        colFind(e.row, [/^item$/, /item issue/]) >= 0 &&
        colFind(e.row, [/net qty/, /purchase qty/, /order qty/, /\bqty\b/]) >= 0);
      if (hi < 0) continue;
      const h = nonSepIdx[hi].e.row;
      const idx = {
        num: colFind(h, [/^#$/, /^no\.?$/, /number/]),
        item: colFind(h, [/^item$/, /item issue/]),
        unit: colFind(h, [/^unit$/]),
        // Purchase/order qty ONLY — 'Net Qty' precedes it in the header and is
        // a different quantity; comparing net vs purchase would false-mismatch.
        qty: colFind(h, [/purchase qty/, /order qty/]),
        cost: colFind(h, [/unit cost/, /unit price/]),
        total: colFind(h, [/est total/, /^total/]),
      };
      if (idx.item < 0) continue;
      const cell = (row, k) => (k >= 0 && k < row.length ? row[k] : '');
      for (let r = hi + 1; r < nonSepIdx.length; r++) {
        const { e } = nonSepIdx[r];
        const row = e.row;
        const joined = row.join(' ');
        if (!joined.trim() || isAggregateRowText(joined)) continue;
        // Numbered-line guard (mirrored): rows must be numbered when a # column exists.
        if (idx.num >= 0 && !/^\d+$/.test(cell(row, idx.num).trim())) continue;
        const name = cell(row, idx.item);
        if (isNullName(name) || /^#/.test(name) || /^unnamed/i.test(name)) continue;
        rows.push({
          line: e.line,
          no: cell(row, idx.num),
          name,
          unit: cell(row, idx.unit),
          qty: srcNum(cell(row, idx.qty)),
          cost: srcNum(cell(row, idx.cost)),
          total: srcNum(cell(row, idx.total)),
        });
      }
    }
  }
  return rows;
};

/**
 * Independently extract the Master BOM data rows from a raw xlsx ArrayBuffer.
 * Mirrors xlsxReader.parseBomSheet's guards (blank/short/#-prefixed names,
 * MATERIAL TOTAL rows). One extra in-memory XLSX.read — no file I/O.
 */
export const extractXlsxBomSourceRows = (buffer) => {
  const wb = XLSX.read(buffer, { type: 'array' });
  const names = (wb && Array.isArray(wb.SheetNames)) ? wb.SheetNames : [];
  const rows = [];
  for (const name of names) {
    if (!/master|reconciliation/.test(H(name))) continue;
    const sheet = (wb.Sheets || {})[name];
    if (!sheet) continue;
    const sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
    if (!Array.isArray(sheetRows) || sheetRows.length === 0) continue;
    // Header row: Item + Qty + a BOM signal (mirrors xlsxReader.findHeaderRow).
    let hIdx = -1;
    for (let r = 0; r < Math.min(sheetRows.length, 15); r++) {
      const joined = sheetRows[r].map((c) => H(c)).join(' ');
      if (/item/.test(joined) && /qty|quantity/.test(joined) &&
          /unit cost|unit price|est total|wastage|spec|basis|confidence|pack/.test(joined)) {
        hIdx = r;
        break;
      }
    }
    if (hIdx < 0) continue;
    const header = sheetRows[hIdx];
    const idx = {
      num: colFind(header, [/^#$/, /^no\.?$/, /number/]),
      item: colFind(header, [/^item\b/]),
      unit: colFind(header, [/^unit$/]),
      // Purchase/order qty ONLY (mirror of the md extractor's rule).
      qty: colFind(header, [/purchase qty/, /order qty/]),
      cost: colFind(header, [/unit cost/, /unit price/]),
      total: colFind(header, [/est total/, /^total/]),
    };
    if (idx.item < 0) continue;
    const cv = (row, k) => (k >= 0 && k < row.length ? String(row[k] ?? '').trim() : '');
    for (let r = hIdx + 1; r < sheetRows.length; r++) {
      const row = sheetRows[r];
      const name = cv(row, idx.item);
      if (isNullName(name) || name.length < 2) continue;
      if (/^#/.test(name)) continue;
      if (/^material\s*total$/i.test(name)) continue;
      rows.push({
        line: r + 1, // spreadsheet row number
        no: cv(row, idx.num),
        name,
        unit: cv(row, idx.unit),
        qty: srcNum(cv(row, idx.qty)),
        cost: srcNum(cv(row, idx.cost)),
        total: srcNum(cv(row, idx.total)),
      });
    }
  }
  return rows;
};

const mismatch = (field, line, ref, expected, shown) =>
  ({ field, line: line ?? null, ref: ref ?? null, expected, shown });

/**
 * Score a BOM import (md or xlsx): compare the parsed ParsedImport against the
 * raw source. Checks line count, item names, quantity, unit cost, unit, total,
 * plus internal total integrity (estTotal vs purchaseQty × unitCost).
 *
 * @param {{ format: 'md'|'xlsx', parsed: ParsedImport, source: string|ArrayBuffer }} input
 * @returns {{ fileType, lineCount, sourceLineCount, errors: object[], warnings: object[], passed: boolean }}
 */
export const scoreBomImport = ({ format, parsed, source }) => {
  const errors = [];
  const warnings = [];
  const srcRows = format === 'md'
    ? extractMdBomSourceRows(source)
    : extractXlsxBomSourceRows(source);
  const bomItems = (parsed && parsed.bomItems) || [];
  const lineCount = bomItems.length;
  const sourceLineCount = srcRows.length;

  if (lineCount !== sourceLineCount) {
    errors.push(mismatch('line_count', null, null, sourceLineCount, lineCount));
  }

  // Multiset match by item name: every source row must have a parsed counterpart.
  const remaining = new Map();
  for (const b of bomItems) {
    const k = String(b.item ?? '').trim();
    remaining.set(k, (remaining.get(k) || 0) + 1);
  }
  const byName = new Map();
  for (const b of bomItems) {
    const k = String(b.item ?? '').trim();
    if (!byName.has(k)) byName.set(k, b);
  }

  const cmp = (field, srcVal, shownVal, s) => {
    if (srcVal === null) return; // source blank/non-numeric — nothing honest to compare
    const pv = parsedNum(shownVal);
    if (pv === null) {
      errors.push(mismatch(field, s.line, s.name, srcVal, '(missing)'));
      return;
    }
    if (Math.abs(round4(srcVal) - round4(pv)) > 0.00005) {
      errors.push(mismatch(field, s.line, s.name, round4(srcVal), round4(pv)));
    }
  };

  for (const s of srcRows) {
    const k = String(s.name || '').trim();
    const have = remaining.get(k) || 0;
    if (have === 0) {
      errors.push(mismatch('item_name', s.line, k, k, '(missing from import)'));
      continue;
    }
    remaining.set(k, have - 1);
    const b = byName.get(k);
    cmp('quantity', s.qty, b.purchaseQty, s);
    cmp('price', s.cost, b.unitCost, s);
    cmp('total', s.total, b.estTotal, s);
    if (s.unit && String(b.unit ?? '').trim() !== s.unit) {
      errors.push(mismatch('unit', s.line, k, s.unit, String(b.unit ?? '') || '(missing)'));
    }
  }

  // Internal integrity: a parsed total must equal qty × cost when all three exist.
  for (const b of bomItems) {
    const q = parsedNum(b.purchaseQty);
    const c = parsedNum(b.unitCost);
    const t = parsedNum(b.estTotal);
    if (q !== null && c !== null && t !== null && Math.abs(round4(q * c) - round4(t)) > 0.00005) {
      errors.push(mismatch('total', null, String(b.item ?? ''), round4(q * c), round4(t)));
    }
  }

  return {
    fileType: format,
    lineCount,
    sourceLineCount,
    errors,
    warnings,
    passed: errors.length === 0,
  };
};

/**
 * Score a supplier CSV import from the csvReader result: in-file duplicates by
 * (name + address) linkKey, rejected rows, blank contact/address warnings.
 *
 * @param {{ validRows: object[], rejectedRows: { rowNumber, reason }[] }} parseResult
 */
export const scoreSupplierCsv = ({ validRows, rejectedRows }) => {
  const errors = [];
  const warnings = [];
  const valid = validRows || [];
  const rejected = rejectedRows || [];

  const seen = new Map(); // linkKey -> first businessName
  valid.forEach((row, i) => {
    const name = String(row.businessName ?? '').trim();
    const line = i + 1; // ordinal among valid rows (rejected rows carry real numbers)
    const key = linkKey(row.businessName, row.address);
    if (seen.has(key)) {
      errors.push(mismatch('duplicate', line, name, 'unique (name + address)', `duplicate of "${seen.get(key)}"`));
    } else {
      seen.set(key, name);
    }
    if (!String(row.contact ?? '').trim()) {
      warnings.push(mismatch('contact', line, name, 'contact listed', '(blank)'));
    }
    if (!String(row.address ?? '').trim()) {
      warnings.push(mismatch('address', line, name, 'address listed', '(blank)'));
    }
  });

  for (const r of rejected) {
    errors.push(mismatch('rejected', r.rowNumber, null, 'valid row', r.reason));
  }

  return {
    fileType: 'csv',
    lineCount: valid.length,
    sourceLineCount: valid.length + rejected.length,
    errors,
    warnings,
    passed: errors.length === 0,
  };
};

/** One-line summary for status banners. */
export const scorecardLine = (score) =>
  `Import check: ${score.passed ? 'PASSED' : 'FAILED'} — ${score.lineCount}/${score.sourceLineCount} lines, ` +
  `${score.errors.length} error${score.errors.length === 1 ? '' : 's'}` +
  (score.warnings.length > 0 ? `, ${score.warnings.length} warning${score.warnings.length === 1 ? '' : 's'}` : '') +
  '.';

export default { scoreBomImport, scoreSupplierCsv, scorecardLine, extractMdBomSourceRows, extractXlsxBomSourceRows };
