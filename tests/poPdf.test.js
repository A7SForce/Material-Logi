/**
 * poPdf.test.js — Agent 5 (Task F acceptance).
 * Seed a project with all confirmations resolved and one item missing a price.
 * The generated PDF must show "TBD" on that line, correct totals on every
 * other line, and the WhatsApp link must follow the exact spec shape.
 * Gate logic itself is untouched (still owned + tested by poGate.test.js).
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import { bulkCreateBomItems } from '../src/data/bomRepo.js';
import { createShortageItem, resolveShortageItem, countUnresolved } from '../src/data/shortageRepo.js';
import { getPoGate } from '../src/screens/poGate.js';
import {
  buildPoLines,
  buildPoTotal,
  buildPoSummaryText,
  buildWhatsAppLink,
  renderPoPdf,
} from '../src/logic/poDocument.js';

beforeEach(async () => {
  await clearAllTables();
});

const seedResolvedProject = async () => {
  const project = await createProject({ name: 'PO PROBE PROJECT' });
  await bulkCreateBomItems([
    { projectId: project.id, item: 'Gypsum Board 9mm', spec: '4x8 sheet', unit: 'pcs', purchaseQty: 12, unitCost: 28 },
    { projectId: project.id, item: 'Mystery Bracket X1', spec: 'Custom', unit: 'pcs', purchaseQty: 5, unitCost: null },
  ]);
  const q = await createShortageItem({
    projectId: project.id,
    severity: 'LOW',
    issue: 'Old question',
    kind: 'agent_question',
    resolved: false,
  });
  await resolveShortageItem(q.id);
  return project;
};

describe('Task F acceptance: TBD PDF + WhatsApp link behind an open gate', () => {
  it('gate is open once all confirmations are resolved', async () => {
    const project = await seedResolvedProject();
    expect(await countUnresolved(project.id)).toBe(0);
    expect(getPoGate(0).allowed).toBe(true);
  });

  it('lines carry TBD only on the missing-price row; totals exclude it', async () => {
    const project = await seedResolvedProject();
    const { listBomItems } = await import('../src/data/bomRepo.js');
    const lines = buildPoLines(await listBomItems(project.id));

    const gypsum = lines.find((l) => l.item === 'Gypsum Board 9mm');
    const mystery = lines.find((l) => l.item === 'Mystery Bracket X1');
    expect({ item: gypsum.item, lineTotal: gypsum.lineTotal }).toEqual({
      item: 'Gypsum Board 9mm',
      lineTotal: 336, // 12 x 28, correct
    });
    expect(mystery.lineTotal).toBeNull(); // never inferred, never zero-filled
    expect(buildPoTotal(lines)).toBe(336);
  });

  it('PDF bytes show TBD on that line and correct figures elsewhere', async () => {
    const project = await seedResolvedProject();
    const { listBomItems } = await import('../src/data/bomRepo.js');
    const lines = buildPoLines(await listBomItems(project.id));
    const total = buildPoTotal(lines);
    const bytes = renderPoPdf({
      projectName: project.name,
      generatedAt: '2026-09-11T00:00:00.000Z',
      lines,
      total,
    });
    expect(bytes.byteLength).toBeGreaterThan(0);
    const text = Buffer.from(bytes).toString('latin1');
    expect(text.includes('PO PROBE PROJECT')).toBe(true);
    expect(text.includes('Gypsum Board 9mm')).toBe(true);
    expect(text.includes('Mystery Bracket X1')).toBe(true);
    expect(text.includes('TBD')).toBe(true);
    expect(text.includes('336.00')).toBe(true);
  });

  it('WhatsApp link follows the exact spec shape', async () => {
    const summary = buildPoSummaryText({ projectName: 'PO PROBE PROJECT', lines: [], total: 0 });
    const link = buildWhatsAppLink(summary);
    expect(link).toBe(`https://wa.me/?text=${encodeURIComponent(summary)}&attachment=po.pdf`);
    expect(link.startsWith('https://wa.me/?text=')).toBe(true);
  });
});
