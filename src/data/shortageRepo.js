/**
 * shortageRepo.js — Agent 2: CRUD for ShortageConfirmItem.
 * (Schema table owned by the data layer; consumed by the merge engine + UI.)
 * kind: "agent_question" | "new_item_pending" | "removed_item_pending"
 */
import db from './db.js';
import { defaultShortageItem } from './schema.js';
import { generateId } from '../utils/helpers.js';

export const createShortageItem = async (partial) => {
  const row = defaultShortageItem({ ...partial, id: partial.id ?? generateId() });
  await db.shortageItems.add(row);
  return row;
};

export const bulkCreateShortageItems = async (partials) => {
  const rows = partials.map((p) => defaultShortageItem({ ...p, id: p.id ?? generateId() }));
  await db.shortageItems.bulkAdd(rows);
  return rows;
};

export const getShortageItem = (id) => db.shortageItems.get(id);

export const listShortageItems = (projectId, { resolved = null } = {}) => {
  let query = db.shortageItems.where('projectId').equals(projectId);
  if (resolved !== null) query = query.and((r) => r.resolved === resolved);
  return query.toArray();
};

export const countUnresolved = (projectId) =>
  db.shortageItems.where('projectId').equals(projectId).and((r) => r.resolved === false).count();

export const resolveShortageItem = async (id) => {
  await db.shortageItems.update(id, { resolved: true });
  return db.shortageItems.get(id);
};

export const reopenShortageItem = async (id) => {
  await db.shortageItems.update(id, { resolved: false });
  return db.shortageItems.get(id);
};

export default {
  createShortageItem,
  bulkCreateShortageItems,
  getShortageItem,
  listShortageItems,
  countUnresolved,
  resolveShortageItem,
  reopenShortageItem,
};
