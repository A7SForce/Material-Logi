/**
 * reimportProject.js — Agent 3: orchestrator for imports into an EXISTING project.
 *
 * Runs the merge diff first, then links supplier entries from the new file via
 * the same shared rule as the seed path (supplierLinking.js). Without this step,
 * a re-import that matches an existing project would update BOM rows but never
 * bring in suppliers — leaving the Suppliers tab empty with no explanation.
 *
 * Pure orchestration: mergeEngine.js itself is untouched.
 */
import { mergeParsedImport } from './mergeEngine.js';
import { linkSupplierEntry, applyPresetsToUnassigned } from './supplierLinking.js';

/**
 * @returns {Promise<MergeResult & { supplierCount: number }>}
 */
export const reimportProject = async (projectId, parsedImport, deps) => {
  const merge = await mergeParsedImport(projectId, parsedImport, deps);
  const supplierRows = [];
  for (const entry of parsedImport.supplierEntries || []) {
    supplierRows.push(await linkSupplierEntry(projectId, entry, deps));
  }
  // Presets for rows still unassigned (manual links never touched).
  const presetsApplied = await applyPresetsToUnassigned(projectId, deps);
  return { ...merge, supplierCount: supplierRows.length, presetsApplied: presetsApplied.length };
};

export default { reimportProject };
