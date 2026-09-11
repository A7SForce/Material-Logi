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
  return { format, parsed: parseXlsx(buffer) };
};

export default parseImport;
