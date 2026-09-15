/**
 * bomExportPdf.test.js — Task M acceptance.
 * Seeds the REAL fixture project (52 lines), generates the export, asserts:
 * header fields (incl. graceful blank client), 52 rows in displayOrder,
 * arithmetically correct category subtotals + grand total, and a missing-price
 * item rendered TBD and excluded from both its subtotal and the grand total.
 */
import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import { createProject, updateProject, getProject } from '../src/data/projectRepo.js';
import * as bomRepo from '../src/data/bomRepo.js';
import * as shortageRepo from '../src/data/shortageRepo.js';
import * as supplierRepo from '../src/data/supplierRepo.js';
import * as presetRepo from '../src/data/presetRepo.js';
import * as changeLogRepo from '../src/data/changeLogRepo.js';
import { parseMarkdown } from '../src/utils/importParser/mdReader.js';
import { seedProjectFromImport } from '../src/logic/seedProject.js';
import {
  buildBomExportLines,
  buildCategoryRollup,
  buildBomExportData,
  renderBomExportPdf,
} from '../src/logic/bomExportDocument.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const mdText = fs.readFileSync(path.join(dir, 'fixtures/Qwen_markdown_20260910_k171vvnlq.md'), 'utf8');

const seedDeps = {
  bulkCreateBomItems: bomRepo.bulkCreateBomItems,
  bulkCreateShortageItems: shortageRepo.bulkCreateShortageItems,
  createSupplier: supplierRepo.createSupplier,
  listSuppliers: supplierRepo.listSuppliers,
  linkSupplierToProject: supplierRepo.linkSupplierToProject,
  appendChangeLog: changeLogRepo.appendChangeLog,
  updateBomItem: bomRepo.updateBomItem,
  getPreset: presetRepo.getPreset,
  getSupplier: supplierRepo.getSupplier,
};

const seedFixtureProject = async () => {
  const project = await createProject({ name: 'SURAU DARUL DAKWAH', location: 'Betong, Sarawak' });
  await seedProjectFromImport(project.id, parseMarkdown(mdText), seedDeps);
  return project;
};

beforeEach(async () => {
  await clearAllTables();
});

describe('Task M: BOM export from the real fixture project', () => {
  it('header populates with a graceful blank client; 52 rows in displayOrder', async () => {
    const project = await seedFixtureProject();
    const lines = buildBomExportLines(await bomRepo.listBomItems(project.id));
    expect(lines).toHaveLength(52);
    expect(lines.map((l) => l.no)).toEqual(Array.from({ length: 52 }, (_, i) => i + 1));
    expect(lines[0]).toMatchObject({ description: 'Gypsum Board 9mm', lineTotal: 336 });

    const data = buildBomExportData({
      project, quotationDate: '10 Sept 2026', source: 'Agent 6/7 Reconciliation Pipeline',
      generatedAt: '2026-09-14T00:00:00.000Z', lines,
    });
    expect(data).toMatchObject({
      title: 'DSG B - PURCHASE LIST',
      projectName: 'SURAU DARUL DAKWAH',
      location: 'Betong, Sarawak',
      clientLine: '—', // unset client renders graceful blank
      itemCount: 52,
    });
    // Client set later shows up verbatim.
    const named = await updateProject(project.id, { client: 'TUAN DIN' });
    const data2 = buildBomExportData({ project: named, quotationDate: '10 Sept 2026', source: 'x', generatedAt: 't', lines });
    expect(data2.clientLine).toBe('TUAN DIN');
  });

  it('category subtotals and grand total are arithmetically correct', async () => {
    const project = await seedFixtureProject();
    const lines = buildBomExportLines(await bomRepo.listBomItems(project.id));
    const data = buildBomExportData({
      project: await getProject(project.id), quotationDate: '10 Sept 2026',
      source: 'Agent 6/7 Reconciliation Pipeline', generatedAt: '2026-09-14T00:00:00.000Z', lines,
    });
    // Independent arithmetic: hand-rolled sums over the same lines.
    const expected = new Map();
    for (const l of lines) {
      if (!expected.has(l.category)) expected.set(l.category, { n: 0, sum: 0 });
      const r = expected.get(l.category);
      r.n += 1;
      if (l.lineTotal !== null) r.sum = Math.round((r.sum + l.lineTotal) * 100) / 100;
    }
    for (const r of data.rollup) {
      const e = expected.get(r.category);
      expect({ category: r.category, lineCount: r.lineCount, subtotal: r.subtotal }).toEqual({
        category: r.category, lineCount: e.n, subtotal: e.sum,
      });
    }
    const pricedSum = [...expected.values()].reduce((s, e) => s + e.sum, 0);
    expect(data.grandTotal).toBe(Math.round(pricedSum * 100) / 100);
    expect(data.grandTotal).toBe(50507); // fixture MATERIAL TOTAL, all lines priced
    expect(data.itemCount).toBe(52);
  });

  it('missing-price item is TBD and excluded from subtotal and grand total', async () => {
    const project = await seedFixtureProject();
    const rows = await bomRepo.listBomItems(project.id);
    const gypsum = rows.find((r) => r.item === 'Gypsum Board 9mm');
    await bomRepo.updateBomItem(gypsum.id, { unitCost: null, estTotal: null });

    const lines = buildBomExportLines(await bomRepo.listBomItems(project.id));
    const gLine = lines.find((l) => l.description === 'Gypsum Board 9mm');
    expect(gLine.lineTotal).toBeNull(); // never inferred, never zero-filled
    const data = buildBomExportData({
      project: await getProject(project.id), quotationDate: '10 Sept 2026',
      source: 'Agent 6/7 Reconciliation Pipeline', generatedAt: '2026-09-14T00:00:00.000Z', lines,
    });
    const boards = data.rollup.find((r) => r.category === gLine.category);
    expect(boards.subtotal).toBeLessThan(50507);
    expect(data.grandTotal).toBe(50507 - 336);
    expect(data.tbdCount).toBe(1);
    const bytes = renderBomExportPdf(data);
    expect(bytes.byteLength).toBeGreaterThan(0);
    const text = Buffer.from(bytes).toString('latin1');
    expect(text.includes('DSG B - PURCHASE LIST')).toBe(true);
    expect(text.includes('SURAU DARUL DAKWAH')).toBe(true);
    expect(text.includes('Gypsum Board 9mm')).toBe(true);
    expect(text.includes('TBD')).toBe(true);
    expect(text.includes('50171.00')).toBe(true); // 50507 - 336
    expect(text.includes('10 Sept 2026')).toBe(true);
  });
});
