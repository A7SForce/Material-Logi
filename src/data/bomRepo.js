/**
 * bomRepo.js — CRUD operations for BomItem table with lockedFields handling
 */

import db from './db.js';

/**
 * Create a new BOM item
 * @param {object} item - BOM item data
 * @returns {Promise<number>} - Item ID
 */
export const createBomItem = async (item) => {
    return await db.bomItems.add({
        projectId: item.projectId,
        item: item.item || '',
        spec: item.spec || '',
        category: item.category || '',
        netQty: item.netQty || 0,
        wastagePct: item.wastagePct || 0,
        purchaseQty: item.purchaseQty || 0,
        unitCost: item.unitCost || 0,
        estTotal: item.estTotal || 0,
        basis: item.basis || '',
        confidence: item.confidence || 1,
        notes: item.notes || '',
        lockedFields: item.lockedFields || []
    });
};

/**
 * Get all BOM items for a project
 * @param {number} projectId - Project ID
 * @returns {Promise<Array>}
 */
export const getBomItemsByProject = async (projectId) => {
    return await db.bomItems.where('projectId').equals(projectId).toArray();
};

/**
 * Get BOM item by ID
 * @param {number} id - Item ID
 * @returns {Promise<object|null>}
 */
export const getBomItemById = async (id) => {
    return await db.bomItems.get(id);
};

/**
 * Find BOM item by item name and spec (case-insensitive)
 * @param {number} projectId - Project ID
 * @param {string} itemName - Item name
 * @param {string} spec - Specification
 * @returns {Promise<object|null>}
 */
export const findBomItemByNameAndSpec = async (projectId, itemName, spec) => {
    const items = await db.bomItems
        .filter(bom => 
            bom.projectId === projectId &&
            bom.item.toLowerCase() === itemName.toLowerCase() &&
            (bom.spec || '').toLowerCase() === (spec || '').toLowerCase()
        )
        .toArray();
    return items.length > 0 ? items[0] : null;
};

/**
 * Update BOM item, respecting locked fields
 * @param {number} id - Item ID
 * @param {object} updates - Fields to update
 * @param {string[]} lockedFields - Fields that should not be overwritten
 * @returns {Promise<void>}
 */
export const updateBomItem = async (id, updates, lockedFields = []) => {
    const existing = await db.bomItems.get(id);
    if (!existing) return;

    const filteredUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
        // Skip if field is locked
        if (lockedFields.includes(key) || (existing.lockedFields || []).includes(key)) {
            continue;
        }
        filteredUpdates[key] = value;
    }

    await db.bomItems.update(id, filteredUpdates);
};

/**
 * Set locked fields on a BOM item
 * @param {number} id - Item ID
 * @param {string[]} fieldsToLock - Field names to lock
 * @returns {Promise<void>}
 */
export const lockBomItemFields = async (id, fieldsToLock) => {
    const existing = await db.bomItems.get(id);
    if (!existing) return;

    const currentLocked = existing.lockedFields || [];
    const newLocked = [...new Set([...currentLocked, ...fieldsToLock])];
    
    await db.bomItems.update(id, { lockedFields: newLocked });
};

/**
 * Delete BOM item
 * @param {number} id - Item ID
 * @returns {Promise<void>}
 */
export const deleteBomItem = async (id) => {
    await db.bomItems.delete(id);
};

/**
 * Bulk upsert BOM items for a project
 * @param {number} projectId - Project ID
 * @param {Array} items - Array of BOM items
 * @returns {Promise<Array>} - Array of item IDs
 */
export const bulkUpsertBomItems = async (projectId, items) => {
    const ids = [];
    for (const item of items) {
        const existing = await findBomItemByNameAndSpec(projectId, item.item, item.spec);
        if (existing) {
            await updateBomItem(existing.id, item, existing.lockedFields);
            ids.push(existing.id);
        } else {
            const newId = await createBomItem({ ...item, projectId });
            ids.push(newId);
        }
    }
    return ids;
};

export default {
    createBomItem,
    getBomItemsByProject,
    getBomItemById,
    findBomItemByNameAndSpec,
    updateBomItem,
    lockBomItemFields,
    deleteBomItem,
    bulkUpsertBomItems
};
