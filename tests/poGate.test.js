/**
 * poGate.test.js — Agent 5: PO blocked while confirmations open.
 * Acceptance: with the sample project loaded and at least one unresolved
 * ShortageConfirmItem, attempting to open PO must redirect to Confirm.
 */
import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import { countUnresolved, listShortageItems } from '../src/data/shortageRepo.js';
import * as bomRepo from '../src/data/bomRepo.js';
import * as shortageRepo from '../src/data/shortageRepo.js';
import * as supplierRepo from '../src/data/supplierRepo.js';
import * as presetRepo from '../src/data/presetRepo.js';
import * as changeLogRepo from '../src/data/changeLogRepo.js';
import { getPoGate, resolveTabRequest } from '../src/screens/poGate.js';
import { parseMarkdown } from '../src/utils/importParser/mdReader.js';
import { seedProjectFromImport } from '../src/logic/seedProject.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

beforeEach(async () => {
  await clearAllTables();
});

describe('PO gate unit rules', () => {
  it('blocks when count > 0, allows at zero', () => {
    expect(getPoGate(3)).toEqual({ allowed: false, redirect: 'confirm' });
    expect(getPoGate(1)).toEqual({ allowed: false, redirect: 'confirm' });
    expect(getPoGate(0)).toEqual({ allowed: true, redirect: null });
  });

  it('redirects PO tab requests to Confirm while blocked', () => {
    expect(resolveTabRequest('po', 2)).toBe('confirm');
    expect(resolveTabRequest('po', 0)).toBe('po');
    expect(resolveTabRequest('bom', 5)).toBe('bom');
    expect(resolveTabRequest('dashboard', 5)).toBe('dashboard');
  });
});

describe('PO gate acceptance: sample project + open confirmation -> redirect', () => {
  it('redirects to Confirm, never renders PO', async () => {
    // Load the real sample project (all 8 MD sections through the real parser).
    const mdText = fs.readFileSync(path.join(dir, 'fixtures/Qwen_markdown_20260910_k171vvnlq.md'), 'utf8');
    const parsed = parseMarkdown(mdText);
    const project = await createProject({ name: parsed.projectTitle });
    await seedProjectFromImport(project.id, parsed, {
      bulkCreateBomItems: bomRepo.bulkCreateBomItems,
      bulkCreateShortageItems: shortageRepo.bulkCreateShortageItems,
      createSupplier: supplierRepo.createSupplier,
      listSuppliers: supplierRepo.listSuppliers,
      linkSupplierToProject: supplierRepo.linkSupplierToProject,
      appendChangeLog: changeLogRepo.appendChangeLog,
      updateBomItem: bomRepo.updateBomItem,
      getPreset: presetRepo.getPreset,
      getSupplier: supplierRepo.getSupplier,
    });

    const open = await countUnresolved(project.id);
    expect(open).toBeGreaterThan(0); // the sample ships 6 open confirmations

    // Attempting to open PO must redirect to Confirm, not render.
    expect(resolveTabRequest('po', open)).toBe('confirm');
    expect(getPoGate(open).allowed).toBe(false);

    // All kinds count: agent_question rows from the sample all block PO.
    const all = await listShortageItems(project.id, { resolved: false });
    expect(all.length).toBe(open);

    // After resolving everything, the gate opens.
    for (const row of all) await shortageRepo.resolveShortageItem(row.id);
    expect(await countUnresolved(project.id)).toBe(0);
    expect(resolveTabRequest('po', 0)).toBe('po');
  });
});
