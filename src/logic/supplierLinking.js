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

export default { linkSupplierEntry };
