/**
 * csvReader.js — Agent 1: raw CSV text -> { validRows, rejectedRows }.
 * Header-text matching (case-insensitive, by name, never by position).
 * No storage, no dedupe, no rendering. No CSV library: basic quote handling
 * in under 40 lines of parsing (checked: no CSV dep in package.json).
 *
 * Columns: businessName (required), contact, address, specialty, logisticsNote,
 * tags, sourceUrl. Any subset may be present. tags splits on ';'. Every other
 * field is a trimmed string, '' if blank — never null, never "undefined".
 * Rows are spreadsheet-numbered (header = row 1) in rejection reports.
 */

const EXPECTED = ['businessname', 'contact', 'address', 'specialty', 'logisticsnote', 'tags', 'sourceurl'];

/** Split one CSV line honoring double-quoted fields ("a,""b""",c). */
const splitLine = (line) => {
  const cells = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { cells.push(cur); cur = ''; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
};

const clean = (v) => {
  if (v === undefined || v === null) return '';
  const s = String(v).trim();
  return /^undefined$/i.test(s) ? '' : s;
};

/**
 * @param {string} text raw CSV content
 * @returns {{ validRows: object[], rejectedRows: { rowNumber, reason }[] }}
 */
export const parseSupplierCsv = (text) => {
  const validRows = [];
  const rejectedRows = [];
  const lines = String(text || '').split(/\r?\n/);
  // Locate the header: first non-blank line.
  let hi = 0;
  while (hi < lines.length && lines[hi].trim() === '') hi++;
  if (hi >= lines.length) return { validRows, rejectedRows };
  const header = splitLine(lines[hi]).map((h) => h.trim().toLowerCase());
  const colIndex = {};
  header.forEach((h, i) => {
    if (EXPECTED.includes(h) && colIndex[h] === undefined) colIndex[h] = i;
  });

  for (let r = hi + 1; r < lines.length; r++) {
    if (lines[r].trim() === '') continue;
    const cells = splitLine(lines[r]);
    const cell = (name) => (colIndex[name] === undefined ? '' : clean(cells[colIndex[name]]));
    const businessName = cell('businessname');
    const rowNumber = r + 1; // spreadsheet numbering: header is row 1
    if (!businessName) {
      rejectedRows.push({ rowNumber, reason: 'missing business name' });
      continue;
    }
    const tagsRaw = cell('tags');
    validRows.push({
      businessName,
      contact: cell('contact'),
      address: cell('address'),
      specialty: cell('specialty'),
      logisticsNote: cell('logisticsnote'),
      tags: tagsRaw ? tagsRaw.split(';').map((t) => t.trim()).filter(Boolean) : [],
      sourceUrl: cell('sourceurl'),
    });
  }
  return { validRows, rejectedRows };
};

/**
 * Read an uploaded File/Blob as text. Prefers Blob.text(), falls back to
 * FileReader (older phone WebViews, jsdom) — same pattern as the BOM importer.
 */
export const readUploadAsText = (blob) => {
  if (typeof blob === 'string') return Promise.resolve(blob);
  if (blob && typeof blob.text === 'function') return blob.text();
  if (typeof FileReader === 'undefined') {
    return Promise.reject(new Error('Cannot read file as text in this environment'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read file as text'));
    reader.readAsText(blob);
  });
};

export default { parseSupplierCsv, readUploadAsText };
