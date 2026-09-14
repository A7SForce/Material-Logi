/**
 * bomRepo.js — Agent 2: CRUD for BomItem, including lockedFields handling.
 * No business logic: locking a field is a plain write; the merge engine
 * decides what locks mean.
 */
import db from './db.js';
import { defaultBomItem } from './schema.js';
import { generateId } from '../utils/helpers.js';

export const createBomItem = async (partial) => {
  const row = defaultBomItem({ ...partial, id: partial.id ?? generateId() });
  await db.bomItems.add(row);
  return row;
};

export const bulkCreateBomItems = async (partials) => {
  const rows = partials.map((p) => defaultBomItem({ ...p, id: p.id ?? generateId() }));
  await db.bomItems.bulkAdd(rows);
  return rows;
};

export const getBomItem = (id) => db.bomItems.get(id);

export const listBomItems = (projectId) =>
  db.bomItems.where('projectId').equals(projectId).toArray();

export const updateBomItem = async (id, patch) => {
  const { lockedFields, ...rest } = patch;
  const safe = { ...rest };
  if (lockedFields !== undefined) {
    safe.lockedFields = Array.isArray(lockedFields) ? [...lockedFields] : [];
  }
  await db.bomItems.update(id, safe);
  return db.bomItems.get(id);
};

/** Add a field name to lockedFields (idempotent). Returns updated row. */
export const lockField = async (id, field) => {
  const row = await db.bomItems.get(id);
  if (!row) throw new Error(`BomItem not found: ${id}`);
  const locked = Array.isArray(row.lockedFields) ? [...row.lockedFields] : [];
  if (!locked.includes(field)) locked.push(field);
  await db.bomItems.update(id, { lockedFields: locked });
  return db.bomItems.get(id);
};

/** Remove a field name from lockedFields (idempotent). Returns updated row. */
export const unlockField = async (id, field) => {
  const row = await db.bomItems.get(id);
  if (!row) throw new Error(`BomItem not found: ${id}`);
  const locked = (Array.isArray(row.lockedFields) ? row.lockedFields : []).filter((f) => f !== field);
  await db.bomItems.update(id, { lockedFields: locked });
  return db.bomItems.get(id);
};

export const deleteBomItem = (id) => db.bomItems.delete(id);

/**
 * Persist a full presentation order: orderedIds[0] becomes displayOrder 0, etc.
 * Cosmetic only — never consulted by merge/itemMatcher. Caller contract: ids are
 * this project's rows in the desired top-to-bottom order. Unknown ids throw.
 */
export const reorderBomItems = async (projectId, orderedIds) => {
  await db.transaction('rw', db.bomItems, async () => {
    let i = 0;
    for (const id of orderedIds) {
      const row = await db.bomItems.get(id);
      if (!row || row.projectId !== projectId) {
        throw new Error(`reorderBomItems: unknown item ${id} for project ${projectId}`);
      }
      await db.bomItems.update(id, { displayOrder: i++ });
    }
  });
  return listBomItems(projectId);
};

/** Highest displayOrder in a project (-1 when empty/all-legacy). */
export const maxDisplayOrder = async (projectId) => {
  const rows = await listBomItems(projectId);
  return rows.reduce(
    (m, r) => Math.max(m, typeof r.displayOrder === 'number' ? r.displayOrder : -1),
    -1
  );
};

export default {
  createBomItem,
  bulkCreateBomItems,
  getBomItem,
  listBomItems,
  updateBomItem,
  lockField,
  unlockField,
  deleteBomItem,
  reorderBomItems,
  maxDisplayOrder,
};
