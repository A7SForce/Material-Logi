/**
 * dataLayer.test.js — Agent 5: write/lock/reload persistence.
 * Acceptance: write a BomItem, mark one field in lockedFields, close and
 * reopen the "app" (db close/reopen), confirm data + lock survived.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, closeDb, openDb, clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import { createBomItem, getBomItem, lockField } from '../src/data/bomRepo.js';

beforeEach(async () => {
  await clearAllTables();
});

describe('data layer acceptance: write/lock/reload persistence', () => {
  it('survives close/reopen with data and lockedFields intact', async () => {
    const project = await createProject({ name: 'RELOAD PROBE' });
    const row = await createBomItem({
      projectId: project.id,
      item: 'Gypsum Board 9mm',
      spec: '4x8 sheet',
      purchaseQty: 12,
      unitCost: 28,
    });

    await lockField(row.id, 'purchaseQty');

    closeDb(); // simulate closing the app
    await openDb(); // simulate reopening the app

    const reloaded = await getBomItem(row.id);
    expect(reloaded).toBeDefined();
    expect({ field: 'purchaseQty', value: reloaded.purchaseQty }).toEqual({
      field: 'purchaseQty',
      value: 12,
    });
    expect({ field: 'lockedFields', value: reloaded.lockedFields }).toEqual({
      field: 'lockedFields',
      value: ['purchaseQty'],
    });
    expect(db.isOpen()).toBe(true);
  });
});
