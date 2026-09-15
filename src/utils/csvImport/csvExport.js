/**
 * csvExport.js — Agent 3: GlobalSupplier rows -> CSV text.
 * Fixed column order ALWAYS: businessName,contact,address,specialty,
 * logisticsNote,tags,sourceUrl — independent of any screen filter/search.
 * tags joins with ';' (exact inverse of the reader's split). Fields containing
 * comma/quote/newline are quoted with doubled quotes.
 */
import { getAllSuppliersForExport } from '../../data/supplierRepo.js';

export const EXPORT_COLUMNS = [
  'businessName',
  'contact',
  'address',
  'specialty',
  'logisticsNote',
  'tags',
  'sourceUrl',
];

const escapeCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const rowToCells = (row) => [
  row.businessName || '',
  row.contact || '',
  row.address || '',
  row.specialty || '',
  row.logisticsNote || '',
  Array.isArray(row.tags) ? row.tags.join(';') : '',
  row.sourceUrl || '',
];

/** Pure builder: rows -> CSV string (header always present, even when empty). */
export const buildSupplierCsv = (rows) => {
  const lines = [EXPORT_COLUMNS.join(',')];
  for (const row of rows || []) lines.push(rowToCells(row).map(escapeCell).join(','));
  return lines.join('\n');
};

/** Full export straight from storage. */
export const exportSupplierDirectory = async () =>
  buildSupplierCsv(await getAllSuppliersForExport());

export default { EXPORT_COLUMNS, buildSupplierCsv, exportSupplierDirectory };
