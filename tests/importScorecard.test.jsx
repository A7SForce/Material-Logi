/**
 * importScorecard.test.jsx — Lane 1A acceptance.
 * 1. Clean real imports (md Qwen, md pandas variant, xlsx same-run pair, CSV
 *    round-trip) all score ZERO errors under the pass rule.
 * 2. Deliberately broken data fails loudly with the right mismatch fields:
 *    source-inconsistent totals, dropped rows, drifted quantities, CSV
 *    duplicates and rejected rows.
 * 3. ImportRun repo: ordering + latest-BOM filtering.
 * 4. UI wiring: real fixture through ProjectsScreen records a PASSED run and
 *    DashboardScreen shows the import-check banner.
 */
/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { clearAllTables } from '../src/data/db.js';
import { parseMarkdown } from '../src/utils/importParser/mdReader.js';
import { parseXlsx } from '../src/utils/importParser/xlsxReader.js';
import { parseSupplierCsv } from '../src/utils/csvImport/csvReader.js';
import { buildSupplierCsv } from '../src/utils/csvImport/csvExport.js';
import {
  scoreBomImport,
  scoreSupplierCsv,
  scorecardLine,
} from '../src/logic/importScorecard.js';
import {
  createImportRun,
  listImportRuns,
  latestImportRun,
  latestBomImportRun,
} from '../src/data/importRunRepo.js';
import ProjectsScreen from '../src/screens/ProjectsScreen.jsx';
import DashboardScreen from '../src/screens/DashboardScreen.jsx';

afterEach(() => cleanup());

const dir = path.dirname(fileURLToPath(import.meta.url));
const readText = (p) => fs.readFileSync(path.join(dir, p), 'utf8');
const readBuffer = (p) => fs.readFileSync(path.join(dir, p));
// Explicit copy: buf.buffer.slice() can produce a non-instanceof ArrayBuffer
// across realms; a fresh ArrayBuffer + Uint8Array.set is always realm-safe.
const toArrayBuffer = (buf) => {
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
};

const QWEN_MD = 'fixtures/Qwen_markdown_20260910_k171vvnlq.md';
const PANDAS_MD = 'fixtures/Surau_Darul_Dakwah_BOM.md';
const SURAU_XLSX = 'fixtures/Surau_Darul_Dakwah_BOM_A7_Grounded_Sourcing.xlsx';

beforeEach(async () => {
  await clearAllTables();
});

describe('Lane 1A: clean real imports score zero errors', () => {
  it('markdown (Qwen fixture): PASSED, 52/52 lines, 0 errors', () => {
    const text = readText(QWEN_MD);
    const parsed = parseMarkdown(text);
    const score = scoreBomImport({ format: 'md', parsed, source: text });
    expect(score.lineCount).toBe(52);
    expect(score.sourceLineCount).toBe(52);
    expect(score.errors).toEqual([]);
    expect(score.passed).toBe(true);
  });

  it('markdown (pandas-export variant): PASSED, 52/52 lines, 0 errors', () => {
    const text = readText(PANDAS_MD);
    const parsed = parseMarkdown(text);
    const score = scoreBomImport({ format: 'md', parsed, source: text });
    expect(score.lineCount).toBe(52);
    expect(score.sourceLineCount).toBe(52);
    expect(score.errors).toEqual([]);
    expect(score.passed).toBe(true);
  });

  it('xlsx (same-run pair): PASSED, 52/52 lines, 0 errors', async () => {
    const ab = toArrayBuffer(readBuffer(SURAU_XLSX));
    const parsed = await parseXlsx(ab);
    const score = scoreBomImport({ format: 'xlsx', parsed, source: ab });
    expect(score.lineCount).toBe(52);
    expect(score.sourceLineCount).toBe(52);
    expect(score.errors).toEqual([]);
    expect(score.passed).toBe(true);
  });

  it('supplier CSV (directory export round-trip): PASSED, 0 errors', () => {
    const rows = [
      { businessName: 'New Eastern Trading', contact: '019-886 1234', address: 'Betong', specialty: 'hardware', tags: ['hardware'] },
      { businessName: 'Lian Phong Hardware', contact: '014-679 0770', address: 'Betong', specialty: 'glue', tags: [] },
      { businessName: 'Joo Sian', contact: '082-123456', address: 'Kuching', specialty: 'electrical', tags: ['electrical', 'lighting'] },
    ];
    const csv = buildSupplierCsv(rows);
    const { validRows, rejectedRows } = parseSupplierCsv(csv);
    const score = scoreSupplierCsv({ validRows, rejectedRows });
    expect(score.lineCount).toBe(3);
    expect(score.sourceLineCount).toBe(3);
    expect(score.errors).toEqual([]);
    expect(score.warnings).toEqual([]);
    expect(score.passed).toBe(true);
  });
});

describe('Lane 1A: broken data fails loudly', () => {
  it('source-inconsistent total (555 -> 557 in the file) is a loud error', () => {
    const text = readText(QWEN_MD);
    const broken = text.replace('| 3 | 185 | 555 | C+E |', '| 3 | 185 | 557 | C+E |');
    expect(broken).not.toBe(text); // the mutation must have landed
    const parsed = parseMarkdown(broken);
    const score = scoreBomImport({ format: 'md', parsed, source: broken });
    expect(score.passed).toBe(false);
    const totalErr = score.errors.find((e) => e.field === 'total');
    expect(totalErr).toBeTruthy();
    expect(totalErr.expected).toBe(555);
    expect(totalErr.shown).toBe(557);
  });

  it('a dropped parsed row (parser under-count) is caught by line_count + item_name', () => {
    const text = readText(QWEN_MD);
    const parsed = parseMarkdown(text);
    parsed.bomItems = parsed.bomItems.slice(0, -1); // simulate the parser dropping a row
    const score = scoreBomImport({ format: 'md', parsed, source: text });
    expect(score.passed).toBe(false);
    expect(score.errors.find((e) => e.field === 'line_count')).toMatchObject({ expected: 52, shown: 51 });
    expect(score.errors.find((e) => e.field === 'item_name')).toBeTruthy();
  });

  it('a drifted quantity (source 9 vs parsed 5) is caught per line', () => {
    const text = readText(QWEN_MD);
    const parsed = parseMarkdown(text);
    const skirting = parsed.bomItems.find((b) => b.item === 'PVC 100mm Skirting');
    skirting.purchaseQty = 5; // simulate qty drift (fixture source says 9)
    const score = scoreBomImport({ format: 'md', parsed, source: text });
    expect(score.passed).toBe(false);
    expect(score.errors.find((e) => e.field === 'quantity')).toMatchObject({
      ref: 'PVC 100mm Skirting',
      expected: 9,
      shown: 5,
    });
  });

  it('CSV in-file duplicates and rejected rows are loud errors', () => {
    const csv = [
      'businessName,contact,address,tags',
      'Same Shop,0123,Betong,hardware',
      'Same Shop,0123,Betong,hardware', // duplicate (name + address)
      ',,,', // missing business name -> rejected
      'Other Shop,0123,Kuching,',
    ].join('\n');
    const { validRows, rejectedRows } = parseSupplierCsv(csv);
    const score = scoreSupplierCsv({ validRows, rejectedRows });
    expect(score.passed).toBe(false);
    expect(score.errors.find((e) => e.field === 'duplicate')).toBeTruthy();
    expect(score.errors.find((e) => e.field === 'rejected')).toMatchObject({ line: 4, shown: 'missing business name' });
  });

  it('CSV blank contact/address are warnings only — import still passes', () => {
    const csv = [
      'businessName,contact,address,tags',
      'No Contact Shop,,,',
    ].join('\n');
    const { validRows, rejectedRows } = parseSupplierCsv(csv);
    const score = scoreSupplierCsv({ validRows, rejectedRows });
    expect(score.passed).toBe(true);
    expect(score.warnings.find((w) => w.field === 'contact')).toBeTruthy();
    expect(score.warnings.find((w) => w.field === 'address')).toBeTruthy();
  });

  it('scorecardLine renders the passive one-line summary', () => {
    expect(scorecardLine({ passed: true, lineCount: 52, sourceLineCount: 52, errors: [], warnings: [] }))
      .toBe('Import check: PASSED — 52/52 lines, 0 errors.');
    expect(scorecardLine({ passed: false, lineCount: 51, sourceLineCount: 52, errors: [{}], warnings: [] }))
      .toBe('Import check: FAILED — 51/52 lines, 1 error.');
  });
});

describe('Lane 1A: ImportRun repo', () => {
  it('records runs, orders newest-first, and latestBomImportRun ignores CSV runs', async () => {
    const projectId = 'proj-1';
    const base = { projectId };
    // Explicit increasing timestamps: same-millisecond ties sort arbitrarily.
    await createImportRun({ ...base, fileType: 'csv', lineCount: 14, sourceLineCount: 14, passed: true, timestamp: '2026-09-25T10:00:00.000Z' });
    await createImportRun({ ...base, fileType: 'md', lineCount: 52, sourceLineCount: 52, passed: true, timestamp: '2026-09-25T11:00:00.000Z' });
    await createImportRun({ ...base, fileType: 'xlsx', lineCount: 11, sourceLineCount: 11, passed: true, timestamp: '2026-09-25T12:00:00.000Z' });

    const all = await listImportRuns(projectId);
    expect(all).toHaveLength(3);
    expect(all[0].fileType).toBe('xlsx'); // newest first
    expect(all.map((r) => r.fileType)).toEqual(['xlsx', 'md', 'csv']);

    const latest = await latestImportRun(projectId);
    expect(latest.fileType).toBe('xlsx');

    // A BOM run is never beaten by a CSV run for the Dashboard check.
    const latestBom = await latestBomImportRun(projectId);
    expect(latestBom.fileType).toBe('xlsx');
    expect(latestBom.fileType).not.toBe('csv');

    // Project isolation.
    expect(await listImportRuns('proj-2')).toHaveLength(0);
    expect(await latestBomImportRun('proj-2')).toBe(null);
  });

  it('rejects a run without a fileType (schema guard)', async () => {
    await expect(createImportRun({ projectId: 'p' })).rejects.toThrow(/fileType/);
  });
});

describe('Lane 1A: UI wiring (passive, no confirm step)', () => {
  it('real md import through ProjectsScreen records a PASSED run; Dashboard shows the check', async () => {
    const text = readText(QWEN_MD);
    const file = new File([text], 'Qwen_markdown_20260910_k171vvnlq.md', { type: 'text/markdown' });
    const opened = vi.fn();
    const ui = render(<ProjectsScreen onOpenProject={opened} />);
    const input = ui.container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(opened).toHaveBeenCalledTimes(1), { timeout: 10000 });

    const projectId = opened.mock.calls[0][0];
    const run = await latestImportRun(projectId);
    expect(run).toBeTruthy();
    expect(run.fileType).toBe('md');
    expect(run.passed).toBe(true);
    expect(run.lineCount).toBe(52);
    ui.unmount();

    const dash = render(<DashboardScreen projectId={projectId} onGoConfirm={() => {}} />);
    await waitFor(() => expect(dash.getByText(/Import check: PASSED/)).toBeTruthy(), { timeout: 5000 });
    expect(dash.getByText(/52\/52 lines/)).toBeTruthy();
    dash.unmount();
  });
});
