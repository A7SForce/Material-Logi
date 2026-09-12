/**
 * approvePending.test.js — Agent 7 gap-fill (Phase 4 invariant review).
 * ConfirmScreen's Approve/Dismiss buttons had repo-level coverage only via the
 * shared deps — this pins the three kind behaviors directly: insert on approve-new,
 * delete on approve-removed, resolve-only on agent questions and on reject.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import * as bomRepo from '../src/data/bomRepo.js';
import * as shortageRepo from '../src/data/shortageRepo.js';
import { approvePendingItem, rejectPendingItem } from '../src/logic/approvePending.js';

const deps = {
  getShortageItem: shortageRepo.getShortageItem,
  resolveShortageItem: shortageRepo.resolveShortageItem,
  createBomItem: bomRepo.createBomItem,
  listBomItems: bomRepo.listBomItems,
  deleteBomItem: bomRepo.deleteBomItem,
};

beforeEach(async () => {
  await clearAllTables();
});

describe('approvePending kinds', () => {
  it('approve new_item_pending inserts the snapshot and resolves', async () => {
    const project = await createProject({ name: 'APPROVE PROBE' });
    const row = await shortageRepo.createShortageItem({
      projectId: project.id, kind: 'new_item_pending', resolved: false,
      issue: 'New pedestal', refItem: 'Pedestal X', refSpec: 'Custom',
      snapshot: { item: 'Pedestal X', spec: 'Custom', purchaseQty: 2, unitCost: 50 },
    });
    const r = await approvePendingItem(row.id, project.id, deps);
    expect(r.action).toBe('added');
    const items = await bomRepo.listBomItems(project.id);
    expect(items.some((b) => b.item === 'Pedestal X' && b.purchaseQty === 2)).toBe(true);
    expect((await shortageRepo.getShortageItem(row.id)).resolved).toBe(true);
  });

  it('approve removed_item_pending deletes the match and resolves', async () => {
    const project = await createProject({ name: 'APPROVE PROBE' });
    const doomed = await bomRepo.createBomItem({ projectId: project.id, item: 'Old Bracket', spec: 'Steel' });
    const row = await shortageRepo.createShortageItem({
      projectId: project.id, kind: 'removed_item_pending', resolved: false,
      issue: 'Missing bracket', refItem: 'Old Bracket', refSpec: 'Steel',
    });
    const r = await approvePendingItem(row.id, project.id, deps);
    expect({ action: r.action, bomId: r.bomId }).toEqual({ action: 'removed', bomId: doomed.id });
    expect(await bomRepo.getBomItem(doomed.id)).toBeUndefined();
  });

  it('agent_question approval and any reject resolve without touching the BOM', async () => {
    const project = await createProject({ name: 'APPROVE PROBE' });
    await bomRepo.createBomItem({ projectId: project.id, item: 'Kept Item', spec: 'S' });
    const q = await shortageRepo.createShortageItem({
      projectId: project.id, kind: 'agent_question', resolved: false, issue: 'Q?',
    });
    const n = await shortageRepo.createShortageItem({
      projectId: project.id, kind: 'new_item_pending', resolved: false,
      issue: 'N?', refItem: 'Ghost', refSpec: 'G', snapshot: { item: 'Ghost', spec: 'G' },
    });
    expect((await approvePendingItem(q.id, project.id, deps)).action).toBe('resolved');
    expect((await rejectPendingItem(n.id, { resolveShortageItem: shortageRepo.resolveShortageItem })).action).toBe('rejected');
    const items = await bomRepo.listBomItems(project.id);
    expect(items).toHaveLength(1); // Ghost never inserted, Kept Item untouched
    expect(items[0].item).toBe('Kept Item');
  });
});
