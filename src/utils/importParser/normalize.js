/**
 * normalize.js — Agent 1 shared normalizer.
 *
 * Both mdReader and xlsxReader output through here into one ParsedImport shape.
 * Deterministic only: never invents values. Missing => null. No guessing.
 *
 * ParsedImport = {
 *   projectTitle: string,
 *   bomItems: [{ item, spec, category, unit, netQty, wastagePct,
 *                purchaseQty, unitCost, estTotal, basis, confidence, pack, notes }],
 *   shortageConfirmItems: [{ severity, issue, missingInfo, confirmationRequired, owner }],
 *   supplierEntries: [{ businessName, contact, address, specialty, logisticsNote, sourceUrl }],
 *   changeLogFromAgent: [{ description }],
 * }
 */

const toNullString = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' || s.toUpperCase() === 'NAN' || s === '—' || s === '-' ? null : s;
};

const toNullNumber = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).trim().replace(/,/g, '');
  if (s === '' || s.toUpperCase() === 'NAN') return null;
  // Handle "20.0%" or "20%" or "0.2" (fraction) for wastage
  const isPct = s.includes('%');
  const n = Number(s.replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(n)) return null;
  return { value: n, isPct };
};

const normalizeWastage = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const parsed = toNullNumber(v);
  if (parsed === null) return null;
  if (typeof parsed === 'number') return cleanNum(parsed);
  // { value, isPct }
  if (parsed.isPct) return cleanNum(parsed.value); // "20%" -> 20
  // fraction like 0.2 -> 20 ; integer like 20 -> 20
  if (parsed.value > 0 && parsed.value < 1) return cleanNum(parsed.value * 100);
  return cleanNum(parsed.value);
};

const numOrNull = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const parsed = toNullNumber(v);
  if (parsed === null) return null;
  if (typeof parsed === 'number') return cleanNum(parsed);
  return cleanNum(parsed.value);
};

/** Kill IEEE-754 dust (e.g. 28.000000000000004 from an xlsx 0.28 fraction). */
const cleanNum = (n) => {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 1e4) / 1e4;
};

export const normalizeBomItem = (raw) => ({
  item: toNullString(raw.item),
  spec: toNullString(raw.spec),
  category: toNullString(raw.category),
  unit: toNullString(raw.unit),
  netQty: numOrNull(raw.netQty),
  wastagePct: normalizeWastage(raw.wastagePct),
  purchaseQty: numOrNull(raw.purchaseQty),
  unitCost: numOrNull(raw.unitCost),
  estTotal: numOrNull(raw.estTotal),
  basis: toNullString(raw.basis),
  confidence: toNullString(raw.confidence),
  pack: toNullString(raw.pack),
  notes: toNullString(raw.notes),
});

export const normalizeShortageItem = (raw) => ({
  severity: toNullString(raw.severity),
  issue: toNullString(raw.issue),
  missingInfo: toNullString(raw.missingInfo),
  confirmationRequired: toNullString(raw.confirmationRequired),
  owner: toNullString(raw.owner),
});

export const normalizeSupplierEntry = (raw) => ({
  businessName: toNullString(raw.businessName),
  contact: toNullString(raw.contact),
  address: toNullString(raw.address),
  specialty: toNullString(raw.specialty),
  logisticsNote: toNullString(raw.logisticsNote),
  sourceUrl: toNullString(raw.sourceUrl),
});

export const normalizeChangeLog = (raw) => {
  if (typeof raw === 'string') {
    const s = raw.trim();
    return s ? { description: s } : null;
  }
  return { description: toNullString(raw.description) };
};

/** Extract "SURAU DARUL DAKWAH" from headers like "MASTER / RECONCILIATION BOM — SURAU DARUL DAKWAH".
 *  Canonical form: location tail after the first comma is stripped
 *  ("SURAU DARUL DAKWAH, BETONG, SARAWAK" -> "SURAU DARUL DAKWAH") so that
 *  .md and .xlsx exports of the same run produce the identical title.
 *  (Same rule as projectMatcher.normalizeTitle; location lives in Project.location, not the title.) */
export const extractProjectTitle = (headerText, fallback = '') => {
  if (!headerText) return fallback || 'UNKNOWN PROJECT';
  const s = String(headerText);
  // Split on em-dash / en-dash / hyphen-pipe patterns, take last meaningful chunk
  const parts = s.split(/[—–|]/).map((p) => p.trim()).filter(Boolean);
  let candidate = parts.length > 1 ? parts[parts.length - 1] : s.trim();
  // Strip trailing qualifiers like ", BETONG, SARAWAK" kept? Keep full but uppercase trim.
  // Remove leading "SURAU..." noise words? Keep as-is, uppercase.
  candidate = candidate.replace(/^(master|reconciliation|bom|project|supplier|purchasing|list|dashboard)\W*/i, '').trim();
  // If candidate looks like "SURAU DARUL DAKWAH, BETONG..." keep first comma chunk + rest? Keep full minus client noise.
  // Remove "Client:..." / "Pipeline:..." tails if concatenated
  candidate = candidate.split(/client:|pipeline:|drawing:/i)[0].trim();
  // Strip location tail ("X, BETONG, SARAWAK" -> "X")
  candidate = candidate.split(',')[0].trim();
  if (!candidate) return fallback || 'UNKNOWN PROJECT';
  // Normalize: collapse spaces, uppercase for stable matching
  return candidate.replace(/\s+/g, ' ').toUpperCase().replace(/,+$/, '').trim() || 'UNKNOWN PROJECT';
};

/** Build final ParsedImport with required keys, empty arrays for absent sections. */
export const buildParsedImport = ({ projectTitle, bomItems = [], shortageConfirmItems = [], supplierEntries = [], changeLogFromAgent = [] }) => {
  // Array.isArray (not just defaults): an explicit null must also resolve to [], never crash .map.
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    projectTitle: projectTitle && String(projectTitle).trim() ? String(projectTitle).trim() : 'UNKNOWN PROJECT',
    bomItems: arr(bomItems).map(normalizeBomItem).filter((b) => b.item !== null),
    shortageConfirmItems: arr(shortageConfirmItems).map(normalizeShortageItem).filter((s) => s.issue !== null || s.confirmationRequired !== null),
    supplierEntries: arr(supplierEntries).map(normalizeSupplierEntry).filter((s) => s.businessName !== null),
    changeLogFromAgent: arr(changeLogFromAgent).map(normalizeChangeLog).filter((c) => c && c.description !== null),
  };
};

export default buildParsedImport;
