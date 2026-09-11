/**
 * detectFormat.js — Agent 1: checks extension, routes to the right reader.
 * Contract: File/ArrayBuffer + filename -> { format: 'md' | 'xlsx', parsed: ParsedImport }
 */
import { parseMarkdown } from './mdReader.js';
import { parseXlsx } from './xlsxReader.js';

export const detectFormat = (filename) => {
  const name = String(filename || '').toLowerCase();
  if (/\.md$|\.markdown$|\.txt$/.test(name)) return 'md';
  if (/\.xlsx$|\.xls$/.test(name)) return 'xlsx';
  return null;
};

const hasFn = (o, m) => !!o && typeof o[m] === 'function';

/**
 * Blob -> text. Prefers Blob.text(), falls back to FileReader so older
 * phone WebViews (and jsdom) can import too.
 */
const blobToText = (blob) => {
  if (typeof blob === 'string') return Promise.resolve(blob);
  if (hasFn(blob, 'text')) return blob.text();
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

/** Blob -> ArrayBuffer, with the same FileReader fallback. */
const blobToArrayBuffer = (blob) => {
  if (blob instanceof ArrayBuffer) return Promise.resolve(blob);
  if (hasFn(blob, 'arrayBuffer')) return blob.arrayBuffer();
  if (typeof FileReader === 'undefined') {
    return Promise.reject(new Error('Cannot read file as binary in this environment'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file as binary'));
    reader.readAsArrayBuffer(blob);
  });
};

/**
 * Parse an import file (File from <input> or { name, buffer/text }) into ParsedImport.
 * @param {File|ArrayBuffer|string} input
 * @param {string} filename
 */
export const parseImport = async (input, filename = '') => {
  const name = (input && input.name) || filename || '';
  const format = detectFormat(name);
  if (!format) {
    throw new Error(`Unsupported file format: "${name}". Only .md and .xlsx accepted.`);
  }
  if (format === 'md') {
    const text = await blobToText(input);
    return { format, parsed: parseMarkdown(text) };
  }
  const buffer = await blobToArrayBuffer(input);
  // NOTE: parseXlsx is async — a missing await here once shipped a Promise as
  // ParsedImport, crashing downstream with "Cannot read properties of undefined".
  return { format, parsed: await parseXlsx(buffer) };
};

/**
 * Map any import failure to a specific, readable message. Raw JS error strings
 * (e.g. "Cannot read properties of undefined") must never reach the screen —
 * log those to the console for debugging instead.
 */
export const friendlyImportError = (err) => {
  const msg = String((err && err.message) || err || '');
  if (/password|encrypted|decrypt/i.test(msg)) {
    return "Couldn't read this file — it may be password-protected. Remove the password and try again.";
  }
  if (/unsupported|not a valid|corrupt|unexpected end|truncat|bad file/i.test(msg)) {
    return "Couldn't read this file — it looks corrupt or isn't a real .md/.xlsx file. Re-export it from the source.";
  }
  if (/no recognizable|empty|no sheets|no content/i.test(msg)) {
    return "No recognizable BOM section found — check the file matches the expected 8-section Agent 6/7 format.";
  }
  return "Couldn't read this file — check it matches the expected 8-section .md/.xlsx format.";
};

/** True when a ParsedImport carries zero usable content in every section. */
export const isEmptyImport = (parsed) => {
  if (!parsed) return true;
  return (
    (parsed.bomItems || []).length === 0 &&
    (parsed.shortageConfirmItems || []).length === 0 &&
    (parsed.supplierEntries || []).length === 0 &&
    (parsed.changeLogFromAgent || []).length === 0
  );
};

export default parseImport;
