/**
 * quickOrderPhoneNormalize.test.js — R1 phone normalization.
 * Hand table pins the deterministic rules (first-segment, 60-default, shape
 * gate, NULL/blank/garbage → null). The sweep runs every contact string actually
 * present in the current supplier fixture through the same function — the point
 * is handling what's really there, not synthetic cases.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { normalizePhoneForWhatsApp, buildQuickOrderLink } from '../src/logic/quickOrder.js';
import { parseMarkdown } from '../src/utils/importParser/mdReader.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

describe('normalizePhoneForWhatsApp rules', () => {
  it.each([
    ['+6016-398 0328', '60163980328'],
    ['6016-398 0328', '60163980328'],
    ['011-1886 5688', '601118865688'],
    ['082-455 809 / 016-867 7888', '6082455809'], // first segment, deterministically
    ['083-321803 / 019-8188527', '6083321803'],
    ['082-252 646', '6082252646'],
    ['NULL', null],
    ['null', null],
    ['', null],
    [null, null],
    [undefined, null],
    ['abc', null],
    ['123', null], // no country shape: blocked, not guessed
    ['0060163980328', null], // double-zero international: blocked, not guessed
  ])('%p → %p', (raw, expected) => {
    expect(normalizePhoneForWhatsApp(raw)).toBe(expected);
  });

  it('builds the exact wa.me link, or null when blocked', () => {
    expect(buildQuickOrderLink('+6016-398 0328', 'hi')).toBe(
      `https://wa.me/60163980328?text=${encodeURIComponent('hi')}`
    );
    expect(buildQuickOrderLink('NULL', 'hi')).toBeNull();
  });
});

describe('real fixture contact sweep', () => {
  it('every contact in the shipped supplier data normalizes without throwing', () => {
    const mdText = fs.readFileSync(path.join(dir, 'fixtures/Qwen_markdown_20260910_k171vvnlq.md'), 'utf8');
    const contacts = parseMarkdown(mdText).supplierEntries.map((s) => s.contact);
    expect(contacts.length).toBe(14);
    const results = contacts.map((c) => normalizePhoneForWhatsApp(c));
    // Spot-check the known shapes; the rest must at least resolve to string|null.
    expect(results).toContain('60163980328');
    expect(results).toContain('601118865688');
    expect(results).toContain('6082455809');
    expect(results.filter((r) => r === null).length).toBeGreaterThan(0); // NULLs stay null
    for (const r of results) {
      expect(r === null || /^60\d{8,10}$/.test(r)).toBe(true);
    }
  });
});
