/**
 * itemSupplierPresets.test.js — Fast Ordering: supervisor-set presets.
 * Resolves on new unlinked items; never overrides an existing manual link;
 * matches via itemMatcher.itemKey (case/space-insensitive, shared function —
 * not reimplemented); stale presets (supplier gone) leave the row unassigned.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import * as bomRepo from '../src/data/bomRepo.js';
import * as supplierRepo from '../src/data/supplierRepo.js';
import * as presetRepo from '../src/data/presetRepo.js';
import { itemKey } from '../src/logic/itemMatcher.js';
import { applyPresetToItem, applyPresetsToUnassigned } from '../src/logic/supplierLinking.js';

const presetDeps = {
  getPreset: presetRepo.getPreset,
  getSupplier: supplierRepo.getSupplier,
  linkSupplierToProject: supplierRepo.linkSupplierToProject,
  updateBomItem: bomRepo.updateBomItem,
  listBomItems: bomRepo.listBomItems,
};

beforeEach(async () => {
  await clearAllTables();
});

describe('ItemSupplierPreset', () => {
  it('resolves on a new unlinked item and links it', async () => {
    const project = await createProject({ name: 'PRESET PROBE' });
    const supplier = await supplierRepo.createSupplier({ businessName: 'Preset Store', address: 'Betong' });
    await presetRepo.setPreset(itemKey('Gypsum Board 9mm', '4x8 sheet'), supplier.id);

    const row = await bomRepo.createBomItem({ projectId: project.id, item: 'Gypsum Board 9mm', spec: '4x8 sheet' });
    const applied = await applyPresetToItem({ ...row, projectId: project.id }, presetDeps);

    expect(applied.id).toBe(supplier.id);
    expect((await bomRepo.getBomItem(row.id)).assignedSupplierId).toBe(supplier.id);
    const links = await supplierRepo.listProjectSuppliers(project.id);
    expect(links).toHaveLength(1);
    expect(links[0].globalSupplierId).toBe(supplier.id);
  });

  it('never overrides an existing manual link', async () => {
    const project = await createProject({ name: 'PRESET PROBE' });
    const manual = await supplierRepo.createSupplier({ businessName: 'Manual Store', address: 'X' });
    const preset = await supplierRepo.createSupplier({ businessName: 'Preset Store', address: 'Y' });
    await presetRepo.setPreset(itemKey('Gypsum Board 9mm', '4x8 sheet'), preset.id);

    const row = await bomRepo.createBomItem({
      projectId: project.id, item: 'Gypsum Board 9mm', spec: '4x8 sheet', assignedSupplierId: manual.id,
    });
    expect(await applyPresetToItem({ ...row, projectId: project.id }, presetDeps)).toBeNull();
    expect((await bomRepo.getBomItem(row.id)).assignedSupplierId).toBe(manual.id);
  });

  it('matches through itemKey normalization (case + spacing variants)', async () => {
    const project = await createProject({ name: 'PRESET PROBE' });
    const supplier = await supplierRepo.createSupplier({ businessName: 'Preset Store', address: 'X' });
    await presetRepo.setPreset(itemKey('gypsum  board 9MM', '4X8  SHEET'), supplier.id);

    const row = await bomRepo.createBomItem({ projectId: project.id, item: 'Gypsum Board 9mm', spec: '4x8 sheet' });
    const applied = await applyPresetToItem({ ...row, projectId: project.id }, presetDeps);
    expect(applied && applied.id).toBe(supplier.id);
  });

  it('stale presets (supplier deleted) leave the row unassigned', async () => {
    const project = await createProject({ name: 'PRESET PROBE' });
    await presetRepo.setPreset(itemKey('Gypsum Board 9mm', '4x8 sheet'), 'ghost-supplier-id');
    const row = await bomRepo.createBomItem({ projectId: project.id, item: 'Gypsum Board 9mm', spec: '4x8 sheet' });
    expect(await applyPresetToItem({ ...row, projectId: project.id }, presetDeps)).toBeNull();
    expect((await bomRepo.getBomItem(row.id)).assignedSupplierId).toBeNull();
  });

  it('applyPresetsToUnassigned covers a project without touching assigned rows', async () => {
    const project = await createProject({ name: 'PRESET PROBE' });
    const s1 = await supplierRepo.createSupplier({ businessName: 'S1', address: 'X' });
    const manual = await supplierRepo.createSupplier({ businessName: 'Manual', address: 'Y' });
    await presetRepo.setPreset(itemKey('Alpha', 'S'), s1.id);
    await bomRepo.createBomItem({ projectId: project.id, item: 'Alpha', spec: 'S' });
    await bomRepo.createBomItem({ projectId: project.id, item: 'Beta', spec: 'S', assignedSupplierId: manual.id });

    const applied = await applyPresetsToUnassigned(project.id, presetDeps);
    expect(applied).toHaveLength(1);
    expect(applied[0].supplierId).toBe(s1.id);
    const rows = await bomRepo.listBomItems(project.id);
    expect(rows.find((r) => r.item === 'Beta').assignedSupplierId).toBe(manual.id);
  });
});
