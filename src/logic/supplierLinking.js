/**
 * supplierLinking.js — Agent 3: shared find-or-create + link for suppliers.
 *
 * Single home of the dedupe rule, used by both the import path (seedProject)
 * and the global browser (SuppliersScreen). Two entries count as the same
 * supplier ONLY if normalized businessName AND normalized address both match —
 * same common name in different towns ("ABC Hardware" Betong vs Kuching) stays
 * two records. Linking an existing record by id can never duplicate it;
 * entries not yet in the directory are created once, then linked.
 *
 * No changes to mergeEngine.js or the import path shape — this only factors
 * the existing rule out so both callers run identical logic.
 */
import { normalizeKey } from './mergeEngine.js';
import { itemKey } from './itemMatcher.js';

/** Dedupe key: name + address, both normalized. Null/blank address matches only blank. */
export const linkKey = (businessName, address) =>
  `${normalizeKey(businessName)}|${normalizeKey(address)}`;

/**
 * Link a supplier entry to a project, reusing the global record when the
 * (name, address) key already exists.
 * @returns {Promise<object>} the GlobalSupplier row (existing or newly created)
 */
export const linkSupplierEntry = async (projectId, entry, deps) => {
  const { listSuppliers, createSupplier, linkSupplierToProject } = deps;
  const existing = await listSuppliers();
  const byKey = new Map(existing.map((s) => [linkKey(s.businessName, s.address), s]));
  let row = byKey.get(linkKey(entry.businessName, entry.address));
  if (!row) {
    row = await createSupplier({ ...entry, tags: Array.isArray(entry.tags) ? entry.tags : [] });
  }
  await linkSupplierToProject({ projectId, globalSupplierId: row.id });
  return row;
};

/**
 * Apply the supervisor-set preset to one BomItem row, if any.
 * Skips rows that already carry an assignment (manual links are never
 * overridden) and stale presets whose supplier no longer exists.
 * Uses itemMatcher.itemKey — the same normalization as merge matching.
 * @returns {Promise<object|null>} the linked supplier row, or null if none applied
 */
export const applyPresetToItem = async (bomRow, deps) => {
  const { getPreset, getSupplier, linkSupplierToProject, updateBomItem } = deps;
  if (!bomRow || bomRow.assignedSupplierId) return null;
  const preset = await getPreset(itemKey(bomRow.item, bomRow.spec));
  if (!preset) return null;
  const supplier = await getSupplier(preset.globalSupplierId);
  if (!supplier) return null; // stale preset: supplier deleted since; leave unassigned
  await linkSupplierToProject({ projectId: bomRow.projectId, globalSupplierId: supplier.id });
  await updateBomItem(bomRow.id, { assignedSupplierId: supplier.id });
  return supplier;
};

/** Apply presets to every currently-unassigned row of a project. */
export const applyPresetsToUnassigned = async (projectId, deps) => {
  const { listBomItems } = deps;
  const applied = [];
  for (const row of await listBomItems(projectId)) {
    const supplier = await applyPresetToItem(row, deps);
    if (supplier) applied.push({ itemId: row.id, supplierId: supplier.id });
  }
  return applied;
};

export default { linkSupplierEntry, linkKey, applyPresetToItem, applyPresetsToUnassigned };
