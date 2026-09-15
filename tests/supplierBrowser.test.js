/**
 * supplierBrowser.test.js — Agent 5 (Task D acceptance).
 * Seed two projects where Project A has a linked supplier from its own import.
 * From Project B's browser, link that same supplier — afterward exactly one
 * GlobalSupplier row must exist, with two ProjectSupplierLink rows (one per
 * project). Re-linking or same-name variants must never duplicate the record.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import * as bomRepo from '../src/data/bomRepo.js';
import * as shortageRepo from '../src/data/shortageRepo.js';
import * as supplierRepo from '../src/data/supplierRepo.js';
import * as changeLogRepo from '../src/data/changeLogRepo.js';
import * as presetRepo from '../src/data/presetRepo.js';
import { seedProjectFromImport } from '../src/logic/seedProject.js';
import { linkSupplierEntry } from '../src/logic/supplierLinking.js';

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

const linkDeps = {
  listSuppliers: supplierRepo.listSuppliers,
  createSupplier: supplierRepo.createSupplier,
  linkSupplierToProject: supplierRepo.linkSupplierToProject,
};

const ENTRY = {
  businessName: 'New Eastern Trading',
  contact: null,
  address: 'Jln Saribas, Pekan Betong, 95700 Betong, Sarawak',
  specialty: 'General hardware',
  logisticsNote: 'Local – Self-collect',
  sourceUrl: 'https://kedaihardwarenearme.my/new-eastern-trading/',
};

beforeEach(async () => {
  await clearAllTables();
});

describe('Task D acceptance: browse + link reuses the global record', () => {
  it('one GlobalSupplier row, two ProjectSupplierLink rows', async () => {
    // Project A's own import brings the supplier into the global directory.
    const projectA = await createProject({ name: 'PROJECT A' });
    await seedProjectFromImport(projectA.id, {
      projectTitle: 'PROJECT A',
      bomItems: [],
      shortageConfirmItems: [],
      supplierEntries: [ENTRY],
      changeLogFromAgent: [],
    }, seedDeps);

    expect(await supplierRepo.listSuppliers()).toHaveLength(1);
    expect(await supplierRepo.listProjectSuppliers(projectA.id)).toHaveLength(1);

    // Project B's browser: list directory, tap the row, link to B.
    const projectB = await createProject({ name: 'PROJECT B' });
    const directory = await supplierRepo.listSuppliers();
    expect(directory).toHaveLength(1);
    await linkSupplierEntry(projectB.id, directory[0], linkDeps);

    const suppliers = await supplierRepo.listSuppliers();
    expect({ globalRows: suppliers.length }).toEqual({ globalRows: 1 });
    const linksA = await supplierRepo.listProjectSuppliers(projectA.id);
    const linksB = await supplierRepo.listProjectSuppliers(projectB.id);
    expect({ linksA: linksA.length, linksB: linksB.length }).toEqual({ linksA: 1, linksB: 1 });
    expect(linksA[0].globalSupplierId).toBe(suppliers[0].id);
    expect(linksB[0].globalSupplierId).toBe(suppliers[0].id);
  });

  it('re-linking and same-name variants never duplicate', async () => {    const projectA = await createProject({ name: 'PROJECT A' });
    const projectB = await createProject({ name: 'PROJECT B' });
    const row = await linkSupplierEntry(projectA.id, ENTRY, linkDeps);

    // Same record tapped again for B, then re-tapped, then a case-variant entry.
    await linkSupplierEntry(projectB.id, row, linkDeps);
    await linkSupplierEntry(projectB.id, row, linkDeps);
    await linkSupplierEntry(projectB.id, { ...ENTRY, businessName: '  new EASTERN trading ' }, linkDeps);

    expect(await supplierRepo.listSuppliers()).toHaveLength(1);
    expect(await supplierRepo.listProjectSuppliers(projectB.id)).toHaveLength(1);
    const linksB = await supplierRepo.listProjectSuppliers(projectB.id);
    expect(linksB[0].globalSupplierId).toBe(row.id);
  });

  it('same name in different towns stays two records (Task E)', async () => {
    const projectA = await createProject({ name: 'PROJECT A' });
    const projectB = await createProject({ name: 'PROJECT B' });
    const betong = await linkSupplierEntry(projectA.id, {
      businessName: 'ABC Hardware',
      address: 'No. 24, Betong New Shophouse, 95700 Betong',
    }, linkDeps);
    const kuching = await linkSupplierEntry(projectB.id, {
      businessName: 'ABC Hardware',
      address: 'Jalan Satok, 93400 Kuching',
    }, linkDeps);

    expect(betong.id).not.toBe(kuching.id);
    const suppliers = await supplierRepo.listSuppliers();
    expect({ globalRows: suppliers.length }).toEqual({ globalRows: 2 });
    const linksA = await supplierRepo.listProjectSuppliers(projectA.id);
    const linksB = await supplierRepo.listProjectSuppliers(projectB.id);
    expect(linksA[0].globalSupplierId).toBe(betong.id);
    expect(linksB[0].globalSupplierId).toBe(kuching.id);
  });
});
