/**
 * approvePending.js — Agent 3: supervisor decisions on queued ShortageConfirmItems.
 * UI calls these; the component itself decides nothing.
 *
 *   approvePendingItem(shortageId, projectId, deps)
 *     - new_item_pending     -> insert snapshot into bomItems, resolve queue row
 *     - removed_item_pending -> delete matching BomItem, resolve queue row
 *     - agent_question       -> resolve only (nothing to apply)
 *   rejectPendingItem(shortageId, deps) -> resolve only, BOM untouched
 */
import { itemKey } from './itemMatcher.js';
import { applyPresetToItem } from './supplierLinking.js';

export const approvePendingItem = async (shortageId, projectId, deps) => {
  const { getShortageItem, resolveShortageItem, createBomItem, listBomItems, deleteBomItem, maxDisplayOrder } = deps;
  const row = await getShortageItem(shortageId);
  if (!row) throw new Error(`ShortageConfirmItem not found: ${shortageId}`);

  if (row.kind === 'new_item_pending') {
    const snap = row.snapshot || { item: row.refItem, spec: row.refSpec };
    // Guard: don't double-insert if the item already landed in the BOM.
    const existing = await listBomItems(projectId);
    const already = existing.some(
      (b) => itemKey(b.item, b.spec) === itemKey(snap.item, snap.spec)
    );
    let bomId = null;
    if (!already) {
      // Appended at the end; the supervisor drags it into place afterward.
      const max = typeof maxDisplayOrder === 'function'
        ? await maxDisplayOrder(projectId)
        : existing.reduce((m, b) => Math.max(m, typeof b.displayOrder === 'number' ? b.displayOrder : -1), -1);
      const created = await createBomItem({ ...snap, projectId, lockedFields: [], displayOrder: max + 1 });
      bomId = created.id;
      // Manual-add equivalent: a fresh row picks up its preset, if any.
      await applyPresetToItem({ ...created, projectId }, deps);
    }
    await resolveShortageItem(shortageId);
    return { action: 'added', bomId };
  }

  if (row.kind === 'removed_item_pending') {
    const existing = await listBomItems(projectId);
    const target = existing.find(
      (b) => itemKey(b.item, b.spec) === itemKey(row.refItem, row.refSpec)
    );
    if (target) await deleteBomItem(target.id);
    await resolveShortageItem(shortageId);
    return { action: 'removed', bomId: target ? target.id : null };
  }

  // agent_question: nothing to apply — resolving is the whole decision.
  await resolveShortageItem(shortageId);
  return { action: 'resolved', bomId: null };
};

export const rejectPendingItem = async (shortageId, deps) => {
  const { resolveShortageItem } = deps;
  await resolveShortageItem(shortageId);
  return { action: 'rejected' };
};

export default { approvePendingItem, rejectPendingItem };
