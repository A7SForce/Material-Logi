/**
 * supplierCsvImport.js — Agent 2: valid CSV rows -> database writes.
 * Wiring only. Matching reuses linkKey (name + address, both normalized) from
 * supplierLinking.js — imported, never reimplemented, file untouched. Creation
 * goes through supplierRepo.createSupplier, updates through updateSupplier.
 *
 * Default on match is SKIP. Overwrite needs explicit overwriteExisting:true and
 * then only touches fields that are non-blank in the CSV row (blank never erases).
 * dryRun:true runs the identical counting path with zero writes, so the UI's
 * confirm step shows exact numbers before committing (orchestrator decision).
 *
 * NOTE: GlobalSupplier has no logisticsNote field (schema) — CSV values there
 * are dropped on write, same as every other creation path. Round-trip stays
 * stable because '' exports back as ''.
 *
 * @returns {{ created, skipped, updated, rejected }}
 */
import { linkKey } from './supplierLinking.js';

const isBlank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

export const importSupplierRows = async (validRows, options = {}, deps) => {
  const { overwriteExisting = false, dryRun = false } = options;
  const { listSuppliers, createSupplier, updateSupplier } = deps;
  const summary = { created: 0, skipped: 0, updated: 0, rejected: [] };

  const existing = await listSuppliers();
  const byKey = new Map(existing.map((s) => [linkKey(s.businessName, s.address), s]));

  for (const row of validRows || []) {
    const key = linkKey(row.businessName, row.address);
    const match = byKey.get(key);
    if (!match) {
      if (!dryRun) {
        const created = await createSupplier({
          businessName: row.businessName,
          contact: row.contact || null,
          address: row.address || null,
          specialty: row.specialty || null,
          sourceUrl: row.sourceUrl || null,
          tags: Array.isArray(row.tags) ? row.tags : [],
        });
        byKey.set(key, created);
      }
      summary.created += 1;
      continue;
    }
    if (overwriteExisting) {
      const patch = {};
      if (!isBlank(row.contact)) patch.contact = row.contact;
      if (!isBlank(row.address)) patch.address = row.address;
      if (!isBlank(row.specialty)) patch.specialty = row.specialty;
      if (!isBlank(row.sourceUrl)) patch.sourceUrl = row.sourceUrl;
      if (!isBlank(row.tags)) patch.tags = row.tags;
      // businessName is the identity — never overwritten.
      if (Object.keys(patch).length > 0 && !dryRun) {
        const updated = await updateSupplier(match.id, patch);
        byKey.set(key, updated);
      }
      summary.updated += 1;
    } else {
      summary.skipped += 1;
    }
  }
  return summary;
};

export default { importSupplierRows };
