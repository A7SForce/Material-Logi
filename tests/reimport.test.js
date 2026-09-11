/**
 * reimport.test.js — Agent 5 (Task H2).
 * Imports matching an existing project take the reimport path: merge diff PLUS
 * supplier linking (previously suppliers were silently dropped on re-import,
 * leaving the Suppliers tab empty). Merge semantics are unchanged.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import * as bomRepo from '../src/data/bomRepo.js';
import * as shortageRepo from '../src/data/shortageRepo.js';
import * as supplierRepo from '../src/data/supplierRepo.js';
import * as changeLogRepo from '../src/data/changeLogRepo.js';
import { seedProjectFromImport } from '../src/logic/seedProject.js';
import { reimportProject } from '../src/logic/reimportProject.js';

const seedDeps = {
  bulkCreateBomItems: bomRepo.bulkCreateBomItems,
  bulkCreateShortageItems: shortageRepo.bulkCreateShortageItems,
  createSupplier: supplierRepo.createSupplier,
  listSuppliers: supplierRepo.listSuppliers,
  linkSupplierToProject: supplierRepo.linkSupplierToProject,
  appendChangeLog: changeLogRepo.appendChangeLog,
};

const reimportDeps = {
  listBomItems: bomRepo.listBomItems,
  getBomItem: bomRepo.getBomItem,
  updateBomItem: bomRepo.updateBomItem,
  lockField: bomRepo.lockField,
  appendChangeLog: changeLogRepo.appendChangeLog,
  createShortageItem: shortageRepo.createShortageItem,
  listShortageItems: shortageRepo.listShortageItems,
  listSuppliers: supplierRepo.listSuppliers,
  createSupplier: supplierRepo.createSupplier,
  linkSupplierToProject: supplierRepo.linkSupplierToProject,
};

const ENTRY_A = { businessName: 'Store A', address: 'Betong', contact: null, specialty: null, sourceUrl: null };
const ENTRY_B = { businessName: 'Store B', address: 'Kuching', contact: null, specialty: null, sourceUrl: null };

const parsed = (bomItems, supplierEntries) => ({
  projectTitle: 'REIMPORT PROBE',
  bomItems,
  shortageConfirmItems: [],
  supplierEntries,
  changeLogFromAgent: [],
});

beforeEach(async () => {
  await clearAllTables();
});

describe('H2: re-import merges AND links suppliers without duplicating', () => {
  it('same file re-imported: no changes, suppliers linked once', async () => {
    const project = await createProject({ name: 'REIMPORT PROBE' });
    const first = parsed(
      [{ item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 12, unitCost: 28 }],
      [ENTRY_A]
    );
    await seedProjectFromImport(project.id, first, seedDeps);
    const result = await reimportProject(project.id, first, reimportDeps);

    expect(result.updatedCount).toBe(0);
    expect(result.newPendingIds).toEqual([]);
    expect(result.removedPendingIds).toEqual([]);
    expect(result.supplierCount).toBe(1);
    expect(await supplierRepo.listSuppliers()).toHaveLength(1); // not duplicated
    expect(await supplierRepo.listProjectSuppliers(project.id)).toHaveLength(1);
  });

  it('changed price merges, new supplier entry links as a second record', async () => {
    const project = await createProject({ name: 'REIMPORT PROBE' });
    await seedProjectFromImport(project.id, parsed(
      [{ item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 12, unitCost: 28 }],
      [ENTRY_A]
    ), seedDeps);

    const result = await reimportProject(project.id, parsed(
      [{ item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 12, unitCost: 30 }],
      [ENTRY_A, ENTRY_B]
    ), reimportDeps);

    expect(result.updatedCount).toBe(1);
    const [row] = await bomRepo.listBomItems(project.id);
    expect(row.unitCost).toBe(30);
    expect(result.supplierCount).toBe(2);
    expect(await supplierRepo.listSuppliers()).toHaveLength(2);
  });

  it('new BOM line still queues as new_item_pending (merge semantics intact)', async () => {
    const project = await createProject({ name: 'REIMPORT PROBE' });
    await seedProjectFromImport(project.id, parsed(
      [{ item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 12, unitCost: 28 }],
      []
    ), seedDeps);

    const result = await reimportProject(project.id, parsed(
      [
        { item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 12, unitCost: 28 },
        { item: 'Mystery Bracket', spec: 'Custom', purchaseQty: 1, unitCost: 9 },
      ],
      []
    ), reimportDeps);

    expect(result.newPendingIds).toHaveLength(1);
    const pending = await shortageRepo.getShortageItem(result.newPendingIds[0]);
    expect(pending.kind).toBe('new_item_pending');
  });
});
