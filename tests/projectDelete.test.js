/**
 * projectDelete.test.js — Agent 5 (Task I acceptance).
 * Deleting a project cascades to its own rows (BOM, confirmations, links, log)
 * but MUST spare shared GlobalSupplier records — still present and re-linkable.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import { createProject, getProject, deleteProject } from '../src/data/projectRepo.js';
import { createBomItem, listBomItems } from '../src/data/bomRepo.js';
import { createShortageItem, listShortageItems } from '../src/data/shortageRepo.js';
import { createSupplier, listSuppliers, listProjectSuppliers, linkSupplierToProject } from '../src/data/supplierRepo.js';
import { appendChangeLog, listChangeLog } from '../src/data/changeLogRepo.js';

beforeEach(async () => {
  await clearAllTables();
});

describe('Task I: project deletion cascades but spares shared suppliers', () => {
  it('own data gone, GlobalSupplier survives and re-links', async () => {
    const a = await createProject({ name: 'DOOMED' });
    const b = await createProject({ name: 'SURVIVOR' });
    const supplier = await createSupplier({ businessName: 'Shared Store', address: 'Betong' });
    await linkSupplierToProject({ projectId: a.id, globalSupplierId: supplier.id });
    await linkSupplierToProject({ projectId: b.id, globalSupplierId: supplier.id });
    await createBomItem({ projectId: a.id, item: 'Gypsum Board 9mm', spec: '4x8 sheet' });
    await createShortageItem({ projectId: a.id, issue: 'Q', kind: 'agent_question', resolved: false });
    await appendChangeLog({ projectId: a.id, actor: 'agent', field: 'x', oldValue: null, newValue: 1 });

    await deleteProject(a.id);

    expect(await getProject(a.id)).toBeUndefined();
    expect(await listBomItems(a.id)).toEqual([]);
    expect(await listShortageItems(a.id)).toEqual([]);
    expect(await listProjectSuppliers(a.id)).toEqual([]);
    expect(await listChangeLog(a.id)).toEqual([]);
    // Shared directory untouched; other project's link intact; re-linkable.
    expect(await listSuppliers()).toHaveLength(1);
    const linksB = await listProjectSuppliers(b.id);
    expect(linksB).toHaveLength(1);
    expect(linksB[0].globalSupplierId).toBe(supplier.id);
    const c = await createProject({ name: 'NEWCOMER' });
    await linkSupplierToProject({ projectId: c.id, globalSupplierId: supplier.id });
    expect(await listProjectSuppliers(c.id)).toHaveLength(1);
  });
});
