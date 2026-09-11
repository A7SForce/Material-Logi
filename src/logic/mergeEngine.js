/**
 * mergeEngine.js — Agent 3: the core diff/lock/queue logic.
 *
 * Implements exactly the pipeline spec, no shortcuts:
 *   - matched item + unlocked field + changed value -> ChangeLogEntry(actor "agent") + overwrite
 *   - matched item + locked field -> skip (keep old value, no log entry)
 *   - new item with no match -> ShortageConfirmItem(kind "new_item_pending"), NOT added to BOM
 *   - existing item missing from import -> ShortageConfirmItem(kind "removed_item_pending"), NOT deleted
 *   - supervisorEdit(field) -> lock field + ChangeLogEntry(actor "supervisor")
 *
 * Deterministic only. Idempotency guard: re-running the same import does not
 * stack duplicate unresolved pending items for the same (kind, item, spec).
 */
import { findMatch } from './itemMatcher.js';

// Data fields diffed by the merge. Identity/meta fields (id, projectId,
// lockedFields) are never overwritten by an import.
export const MERGE_FIELDS = [
  'item',
  'spec',
  'category',
  'unit',
  'netQty',
  'wastagePct',
  'purchaseQty',
  'unitCost',
  'estTotal',
  'basis',
  'confidence',
  'pack',
  'notes',
];

// Fields a supervisor may edit by hand (same set — identity fields excluded).
export const EDITABLE_FIELDS = [...MERGE_FIELDS];

/** Deterministic value equality: null==undefined==blank, numeric "12"==12, else trimmed string. */
export const valuesEqual = (a, b) => {
  const blank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
  const na = blank(a) ? null : a;
  const nb = blank(b) ? null : b;
  if (na === null || nb === null) return na === nb;
  if (typeof na === 'number' && typeof nb === 'number') return na === nb;
  const sa = String(na).trim();
  const sb = String(nb).trim();
  if (sa === sb) return true;
  const pa = Number(sa.replace(/,/g, ''));
  const pb = Number(sb.replace(/,/g, ''));
  if (sa !== '' && sb !== '' && Number.isFinite(pa) && Number.isFinite(pb)) {
    return pa === pb;
  }
  return false;
};

export const normalizeKey = (s) =>
  String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const pendingKey = (kind, item, spec) => `${kind}|${normalizeKey(item)}|${normalizeKey(spec)}`;

/**
 * Merge a fresh ParsedImport into stored rows for a project.
 *
 * @param {string} projectId
 * @param {object} parsedImport ParsedImport shape from Agent 1
 * @param {object} deps { listBomItems, updateBomItem, appendChangeLog, createShortageItem, listShortageItems }
 *   (injected so the engine never reaches into another layer directly)
 * @returns {Promise<MergeResult>}
 *   MergeResult = { projectId, updatedCount, skippedLocked: [{itemId, field}],
 *                   newPendingIds, removedPendingIds, changeLogIds }
 */
export const mergeParsedImport = async (projectId, parsedImport, deps) => {
  const { listBomItems, updateBomItem, appendChangeLog, createShortageItem, listShortageItems } = deps;
  const existing = await listBomItems(projectId);
  const openPending = (await listShortageItems(projectId, { resolved: false })).filter((p) =>
    p.kind === 'new_item_pending' || p.kind === 'removed_item_pending'
  );
  const seenPending = new Set(openPending.map((p) => pendingKey(p.kind, p.refItem ?? p.issue, p.refSpec ?? '')));

  const result = {
    projectId,
    updatedCount: 0,
    skippedLocked: [],
    newPendingIds: [],
    removedPendingIds: [],
    changeLogIds: [],
  };

  const matchedExistingIds = new Set();
  const incomingKeys = new Set();

  for (const incoming of parsedImport.bomItems) {
    const match = findMatch(existing, incoming.item, incoming.spec);
    if (match) {
      matchedExistingIds.add(match.id);
      incomingKeys.add(`${normalizeKey(match.item)}|${normalizeKey(match.spec)}`);
      const locked = Array.isArray(match.lockedFields) ? match.lockedFields : [];
      const patch = {};
      for (const field of MERGE_FIELDS) {
        if (locked.includes(field)) {
          // Report the skip only if the import actually disagrees (signal, not noise).
          if (!valuesEqual(match[field], incoming[field])) {
            result.skippedLocked.push({ itemId: match.id, field });
          }
          continue;
        }
        if (!valuesEqual(match[field], incoming[field])) {
          const entry = await appendChangeLog({
            projectId,
            actor: 'agent',
            field: `${match.item} :: ${field}`,
            oldValue: match[field],
            newValue: incoming[field],
          });
          result.changeLogIds.push(entry.id);
          patch[field] = incoming[field];
        }
      }
      if (Object.keys(patch).length > 0) {
        await updateBomItem(match.id, patch);
        result.updatedCount += 1;
      }
    } else {
      // New item -> queue for supervisor, do NOT add to BOM.
      const key = pendingKey('new_item_pending', incoming.item, incoming.spec);
      incomingKeys.add(`${normalizeKey(incoming.item)}|${normalizeKey(incoming.spec)}`);
      if (!seenPending.has(key)) {
        const row = await createShortageItem({
          projectId,
          severity: 'MEDIUM',
          issue: `New item in import: ${incoming.item ?? '(unnamed)'}`,
          missingInfo: incoming.spec ?? null,
          confirmationRequired: 'Confirm this new item should be added to the BOM.',
          owner: 'Supervisor',
          resolved: false,
          kind: 'new_item_pending',
          refItem: incoming.item,
          refSpec: incoming.spec,
          snapshot: { ...incoming },
        });
        seenPending.add(key);
        result.newPendingIds.push(row.id);
      }
    }
  }

  for (const old of existing) {
    if (matchedExistingIds.has(old.id)) continue;
    // Existing item with no match in the new import -> queue, do NOT delete.
    const key = pendingKey('removed_item_pending', old.item, old.spec);
    if (!seenPending.has(key)) {
      const row = await createShortageItem({
        projectId,
        severity: 'MEDIUM',
        issue: `Item missing from import: ${old.item ?? '(unnamed)'}`,
        missingInfo: old.spec ?? null,
        confirmationRequired: 'Confirm this item should be removed from the BOM.',
        owner: 'Supervisor',
        resolved: false,
        kind: 'removed_item_pending',
        refItem: old.item,
        refSpec: old.spec,
        snapshot: { ...old },
      });
      seenPending.add(key);
      result.removedPendingIds.push(row.id);
    }
  }

  return result;
};

/**
 * Supervisor manual edit: overwrite + lock the field + supervisor ChangeLogEntry.
 */
export const supervisorEdit = async (bomItemId, field, newValue, deps) => {
  const { getBomItem, lockField, updateBomItem, appendChangeLog } = deps;
  if (!EDITABLE_FIELDS.includes(field)) {
    throw new Error(`Field not editable by supervisor: ${field}`);
  }
  const row = await getBomItem(bomItemId);
  if (!row) throw new Error(`BomItem not found: ${bomItemId}`);
  const oldValue = row[field] ?? null;
  await updateBomItem(bomItemId, { [field]: newValue });
  await lockField(bomItemId, field);
  const entry = await appendChangeLog({
    projectId: row.projectId,
    actor: 'supervisor',
    field: `${row.item} :: ${field}`,
    oldValue,
    newValue,
  });
  return { updated: await getBomItem(bomItemId), changeLogId: entry.id };
};

export default { mergeParsedImport, supervisorEdit, MERGE_FIELDS, EDITABLE_FIELDS, valuesEqual };
