/**
 * mergeEngine.test.js — Agent 5: the three merge cases. All must pass.
 * 1. Locked purchaseQty + import changing it -> NOT overwritten, no agent log for it.
 * 2. New item in import -> new_item_pending ShortageConfirmItem, NOT in BOM.
 * 3. Import missing an old item -> removed_item_pending, stored item untouched.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import * as bomRepo from '../src/data/bomRepo.js';
import * as shortageRepo from '../src/data/shortageRepo.js';
import * as changeLogRepo from '../src/data/changeLogRepo.js';
import { mergeParsedImport } from '../src/logic/mergeEngine.js';

const deps = {
  listBomItems: bomRepo.listBomItems,
  getBomItem: bomRepo.getBomItem,
  updateBomItem: bomRepo.updateBomItem,
  lockField: bomRepo.lockField,
  appendChangeLog: changeLogRepo.appendChangeLog,
  createShortageItem: shortageRepo.createShortageItem,
  listShortageItems: shortageRepo.listShortageItems,
};

const baseImport = (bomItems) => ({
  projectTitle: 'SURAU DARUL DAKWAH',
  bomItems,
  shortageConfirmItems: [],
  supplierEntries: [],
  changeLogFromAgent: [],
});

const seedTwo = async (projectId) => {
  await bomRepo.bulkCreateBomItems([
    { projectId, item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 12, unitCost: 28 },
    { projectId, item: 'Metal Stud', spec: 'Frame', purchaseQty: 96, unitCost: 3 },
  ]);
};

beforeEach(async () => {
  await clearAllTables();
});

describe('merge engine acceptance: three cases', () => {
  it('case 1: locked field is not overwritten and not logged', async () => {
    const project = await createProject({ name: 'SURAU DARUL DAKWAH' });
    await seedTwo(project.id);
    const [gypsum] = (await bomRepo.listBomItems(project.id)).filter(
      (b) => b.item === 'Gypsum Board 9mm'
    );
    await bomRepo.lockField(gypsum.id, 'purchaseQty');

    const result = await mergeParsedImport(
      project.id,
      baseImport([
        { item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 20, unitCost: 30 },
        { item: 'Metal Stud', spec: 'Frame', purchaseQty: 96, unitCost: 3 },
      ]),
      deps
    );

    const after = await bomRepo.getBomItem(gypsum.id);
    expect({ item: after.item, purchaseQty: after.purchaseQty }).toEqual({
      item: 'Gypsum Board 9mm',
      purchaseQty: 12, // unchanged — lock held
    });
    expect(after.unitCost).toBe(30); // unlocked field still merges
    expect(result.skippedLocked).toContainEqual({ itemId: gypsum.id, field: 'purchaseQty' });

    const log = await changeLogRepo.listChangeLog(project.id);
    const purchaseQtyClaims = log.filter((e) => e.field === 'Gypsum Board 9mm :: purchaseQty');
    expect(purchaseQtyClaims).toEqual([]); // no entry may claim the locked write happened
    expect(log.some((e) => e.field === 'Gypsum Board 9mm :: unitCost' && e.actor === 'agent')).toBe(true);
  });

  it('case 2: unknown item becomes new_item_pending, never silently added', async () => {
    const project = await createProject({ name: 'SURAU DARUL DAKWAH' });
    await seedTwo(project.id);

    const result = await mergeParsedImport(
      project.id,
      baseImport([
        { item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 12, unitCost: 28 },
        { item: 'Metal Stud', spec: 'Frame', purchaseQty: 96, unitCost: 3 },
        { item: 'Mystery Bracket X1', spec: 'Custom', purchaseQty: 5, unitCost: 99 },
      ]),
      deps
    );

    expect(result.newPendingIds.length).toBe(1);
    const items = await bomRepo.listBomItems(project.id);
    expect(items.some((b) => b.item === 'Mystery Bracket X1')).toBe(false);
    const pending = await shortageRepo.getShortageItem(result.newPendingIds[0]);
    expect({ kind: pending.kind, resolved: pending.resolved }).toEqual({
      kind: 'new_item_pending',
      resolved: false,
    });
  });

  it('case 3: missing item becomes removed_item_pending, stored row untouched', async () => {
    const project = await createProject({ name: 'SURAU DARUL DAKWAH' });
    await seedTwo(project.id);

    const result = await mergeParsedImport(
      project.id,
      baseImport([
        { item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 12, unitCost: 28 },
        // Metal Stud deliberately absent from the new import
      ]),
      deps
    );

    expect(result.removedPendingIds.length).toBe(1);
    const pending = await shortageRepo.getShortageItem(result.removedPendingIds[0]);
    expect({ kind: pending.kind, resolved: pending.resolved }).toEqual({
      kind: 'removed_item_pending',
      resolved: false,
    });
    const items = await bomRepo.listBomItems(project.id);
    const stud = items.find((b) => b.item === 'Metal Stud');
    expect(stud).toBeDefined();
    expect({ item: stud.item, purchaseQty: stud.purchaseQty }).toEqual({
      item: 'Metal Stud',
      purchaseQty: 96, // untouched
    });
  });
});
