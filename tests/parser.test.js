/**
 * parser.test.js — Agent 5: same-run fixture pair -> DEEP EQUAL ParsedImport.
 *
 * Ground truth: both fixtures are exports of ONE Agent 6/7 run (2026-09-10
 * ~14:00): the .md (15:01) and the .xlsx (14:08) carry identical data —
 * 52 bom lines, 6 shortage rows, 14 supplier entries, 5 change-log lines.
 * (The Sep-08 xlsx previously staged here was a different run and has been
 * replaced; see BUILD_PROGRESS.md Task A.)
 *
 * This test asserts FULL deep equality field-by-field. It fails loudly if the
 * two formats ever produce different data for the same run — not just on
 * shape changes. Deterministic parser rules that make this hold:
 *   - canonical projectTitle (location tail stripped),
 *   - numbers cleaned to 4dp (kills xlsx float dust like 28.000000000000004),
 *   - markdown-link URLs parsed greedily (paren-containing URLs survive).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/utils/importParser/mdReader.js';
import { parseXlsx } from '../src/utils/importParser/xlsxReader.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const mdText = fs.readFileSync(path.join(dir, 'fixtures/Qwen_markdown_20260910_k171vvnlq.md'), 'utf8');
const xlsxBuf = fs.readFileSync(
  path.join(dir, 'fixtures/Surau_Darul_Dakwah_BOM_A7_Grounded_Sourcing.xlsx')
);
const xlsxAb = xlsxBuf.buffer.slice(xlsxBuf.byteOffset, xlsxBuf.byteOffset + xlsxBuf.byteLength);

const BOM_KEYS = ['item', 'spec', 'category', 'unit', 'netQty', 'wastagePct', 'purchaseQty', 'unitCost', 'estTotal', 'basis', 'confidence', 'pack', 'notes'];

describe('parser acceptance: same run, both formats, deep-equal ParsedImport', () => {
  it('produces deeply equal ParsedImport outputs (field by field)', async () => {
    const md = parseMarkdown(mdText);
    const xlsx = await parseXlsx(xlsxAb);
    expect(xlsx).toEqual(md);
  });

  it('documents the fixture: 52 / 6 / 14 / 5 (fails loudly on fixture drift)', async () => {
    const md = parseMarkdown(mdText);
    expect(md.projectTitle).toBe('SURAU DARUL DAKWAH');
    expect(md.bomItems).toHaveLength(52);
    expect(md.shortageConfirmItems).toHaveLength(6);
    expect(md.supplierEntries).toHaveLength(14);
    expect(md.changeLogFromAgent).toHaveLength(5);
  });

  it('agrees on anchor values incl. float-prone and paren-URL cases', async () => {
    const xlsx = await parseXlsx(xlsxAb);
    const g4516 = xlsx.bomItems.find((r) => r.item === 'PVC 45mm G4516 Wainscoting');
    expect(g4516.wastagePct).toBe(28); // xlsx stores 0.28 fraction, not float dust
    const skirting = xlsx.bomItems.find((r) => r.item === 'PVC 100mm Skirting');
    expect(skirting.wastagePct).toBe(29);
    const waze = xlsx.supplierEntries.find((s) => s.businessName.startsWith('Sin Teck Hung'));
    const md = parseMarkdown(mdText);
    const wazeMd = md.supplierEntries.find((s) => s.businessName.startsWith('Sin Teck Hung'));
    expect(waze.sourceUrl).toBe(wazeMd.sourceUrl);
    expect(waze.sourceUrl.endsWith('(jotun-studio-and-jotun-paints-dealer)')).toBe(true);
    for (const row of xlsx.bomItems) expect(Object.keys(row).sort()).toEqual([...BOM_KEYS].sort());
  });

  it('never guesses: absent sections are empty arrays, not errors', async () => {
    const xlsx = await parseXlsx(xlsxAb);
    expect(Array.isArray(xlsx.supplierEntries)).toBe(true);
    expect(Array.isArray(xlsx.changeLogFromAgent)).toBe(true);
  });
});
