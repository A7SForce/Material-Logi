/**
 * bomReorder.test.jsx — Task L acceptance (+ UI wiring).
 * Seed a project, move item 3 to position 1, reload — order persists.
 * Re-import the same file afterward — order unchanged, no merge conflict,
 * lockedFields untouched (displayOrder never enters matching/diff logic).
 * UI: # badges render 1..n and the up/down buttons move rows through the screen.
 */
/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import * as bomRepo from '../src/data/bomRepo.js';
import * as shortageRepo from '../src/data/shortageRepo.js';
import * as supplierRepo from '../src/data/supplierRepo.js';
import * as changeLogRepo from '../src/data/changeLogRepo.js';
import * as presetRepo from '../src/data/presetRepo.js';
import { seedProjectFromImport } from '../src/logic/seedProject.js';
import { mergeParsedImport } from '../src/logic/mergeEngine.js';
import { approvePendingItem } from '../src/logic/approvePending.js';
import BomScreen from '../src/screens/BomScreen.jsx';

afterEach(() => cleanup());

const mergeDeps = {
  listBomItems: bomRepo.listBomItems,
  getBomItem: bomRepo.getBomItem,
  updateBomItem: bomRepo.updateBomItem,
  lockField: bomRepo.lockField,
  appendChangeLog: changeLogRepo.appendChangeLog,
  createShortageItem: shortageRepo.createShortageItem,
  listShortageItems: shortageRepo.listShortageItems,
};

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

const THREE = {
  projectTitle: 'REORDER PROBE',
  bomItems: [
    { item: 'Alpha', spec: 'S', purchaseQty: 1, unitCost: 10 },
    { item: 'Beta', spec: 'S', purchaseQty: 2, unitCost: 20 },
    { item: 'Gamma', spec: 'S', purchaseQty: 3, unitCost: 30 },
  ],
  shortageConfirmItems: [],
  supplierEntries: [],
  changeLogFromAgent: [],
};

const orderOf = async (projectId) => {
  const rows = await bomRepo.listBomItems(projectId);
  return rows
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((r) => [r.item, r.displayOrder]);
};

beforeEach(async () => {
  await clearAllTables();
});

describe('Task L: reorder persists; re-import leaves order alone', () => {
  it('seed assigns import order; move item 3 to position 1 persists across reload', async () => {
    const project = await createProject({ name: 'REORDER PROBE' });
    await seedProjectFromImport(project.id, THREE, seedDeps);
    expect(await orderOf(project.id)).toEqual([['Alpha', 0], ['Beta', 1], ['Gamma', 2]]);

    const rows = await bomRepo.listBomItems(project.id);
    const byName = Object.fromEntries(rows.map((r) => [r.item, r.id]));
    await bomRepo.reorderBomItems(project.id, [byName.Gamma, byName.Alpha, byName.Beta]);

    // Reload = fresh reads: Gamma first, renumbered 0..2.
    expect(await orderOf(project.id)).toEqual([['Gamma', 0], ['Alpha', 1], ['Beta', 2]]);
  });

  it('re-import keeps displayOrder, locks, and raises no conflicts', async () => {
    const project = await createProject({ name: 'REORDER PROBE' });
    await seedProjectFromImport(project.id, THREE, seedDeps);
    const rows = await bomRepo.listBomItems(project.id);
    const byName = Object.fromEntries(rows.map((r) => [r.item, r.id]));
    await bomRepo.lockField(byName.Alpha, 'purchaseQty');
    await bomRepo.reorderBomItems(project.id, [byName.Gamma, byName.Alpha, byName.Beta]);

    const result = await mergeParsedImport(project.id, THREE, mergeDeps);

    expect(result.updatedCount).toBe(0);
    expect(result.newPendingIds).toEqual([]);
    expect(result.removedPendingIds).toEqual([]);
    expect(await orderOf(project.id)).toEqual([['Gamma', 0], ['Alpha', 1], ['Beta', 2]]);
    expect((await bomRepo.getBomItem(byName.Alpha)).lockedFields).toEqual(['purchaseQty']);
  });

  it('approved Confirm items append at max + 1', async () => {
    const project = await createProject({ name: 'REORDER PROBE' });
    await seedProjectFromImport(project.id, THREE, seedDeps);
    expect(await bomRepo.maxDisplayOrder(project.id)).toBe(2);

    const pending = await shortageRepo.createShortageItem({
      projectId: project.id, kind: 'new_item_pending', resolved: false,
      issue: 'New pedestal', refItem: 'Pedestal', refSpec: 'Custom',
      snapshot: { item: 'Pedestal', spec: 'Custom', purchaseQty: 1, unitCost: 5 },
    });
    await approvePendingItem(pending.id, project.id, {
      getShortageItem: shortageRepo.getShortageItem,
      resolveShortageItem: shortageRepo.resolveShortageItem,
      createBomItem: bomRepo.createBomItem,
      listBomItems: bomRepo.listBomItems,
      deleteBomItem: bomRepo.deleteBomItem,
      maxDisplayOrder: bomRepo.maxDisplayOrder,
      updateBomItem: bomRepo.updateBomItem,
      getPreset: presetRepo.getPreset,
      getSupplier: supplierRepo.getSupplier,
      linkSupplierToProject: supplierRepo.linkSupplierToProject,
    });
    expect(await orderOf(project.id)).toEqual([['Alpha', 0], ['Beta', 1], ['Gamma', 2], ['Pedestal', 3]]);
  });

  it('UI: # badges render and the down button moves a row', async () => {
    const project = await createProject({ name: 'REORDER PROBE' });
    await seedProjectFromImport(project.id, THREE, seedDeps);
    const ui = render(<BomScreen projectId={project.id} />);
    await ui.findByText('Gamma');
    const badges = ui.container.querySelectorAll('.badge');
    expect([...badges].map((b) => b.textContent).filter((t) => /^\d+$/.test(t))).toEqual(['1', '2', '3']);

    const alphaRow = (await screen.findByText('Alpha')).closest('.row');
    fireEvent.click(within(alphaRow).getByRole('button', { name: 'Move Alpha down' }));
    await screen.findByText('Moved "Alpha" to position 2. Order saved.');
    expect(await orderOf(project.id)).toEqual([['Beta', 0], ['Alpha', 1], ['Gamma', 2]]);
    ui.unmount();
  });
});
