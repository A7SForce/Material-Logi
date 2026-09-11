/**
 * seedProject.js — Agent 3: first-import path. Writes a fresh ParsedImport
 * into an empty project. No diffing, no locking — that is mergeEngine's job
 * on the *second* import.
 *
 * Writes:
 *   - bomItems (bulk)
 *   - ShortageConfirmItem(kind "agent_question") for each source shortage row
 *   - GlobalSupplier + ProjectSupplierLink for each source supplier entry
 *     (dedupes suppliers by normalized businessName so re-seeds share rows)
 *   - ChangeLogEntry(actor "agent", field "import_note") for each source change-log line
 */
import { linkSupplierEntry } from './supplierLinking.js';

export const seedProjectFromImport = async (projectId, parsedImport, deps) => {
  const {
    bulkCreateBomItems,
    bulkCreateShortageItems,
    appendChangeLog,
  } = deps;

  const bomRows = await bulkCreateBomItems(
    parsedImport.bomItems.map((b) => ({ ...b, projectId }))
  );

  const shortageRows = await bulkCreateShortageItems(
    (parsedImport.shortageConfirmItems || []).map((s) => ({
      ...s,
      projectId,
      resolved: false,
      kind: 'agent_question',
    }))
  );

  // Supplier dedupe (name + address) lives in supplierLinking.js (shared
  // with the global browser). Global directory shared across projects.
  const supplierRows = [];
  for (const entry of parsedImport.supplierEntries || []) {
    supplierRows.push(await linkSupplierEntry(projectId, entry, deps));
  }

  const changeLogIds = [];
  for (const line of parsedImport.changeLogFromAgent || []) {
    const entry = await appendChangeLog({
      projectId,
      actor: 'agent',
      field: 'import_note',
      oldValue: null,
      newValue: line.description,
    });
    changeLogIds.push(entry.id);
  }

  return {
    projectId,
    bomCount: bomRows.length,
    shortageCount: shortageRows.length,
    supplierCount: supplierRows.length,
    changeLogIds,
  };
};

export default { seedProjectFromImport };
