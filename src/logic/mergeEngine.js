/**
 * mergeEngine.js — Core diff/lock/queue logic for merging imports
 * 
 * Implements the exact merge algorithm from the spec:
 * - For each item in new ParsedImport.bomItems:
 *   - If match found: update non-locked fields, log changes
 *   - If no match: create ShortageConfirmItem (new_item_pending)
 * - For each existing item with no match: create ShortageConfirmItem (removed_item_pending)
 * - When supervisor edits: add field to lockedFields
 */

import { findMatchingItem } from './itemMatcher.js';
import { getBomItemsByProject, createBomItem, updateBomItem, lockBomItemFields } from '../data/bomRepo.js';
import { createChangeLogEntry } from '../data/changeLogRepo.js';

/**
 * Create a shortage/confirm item for pending resolution
 * @param {string} kind - 'new_item_pending' | 'removed_item_pending' | 'agent_question'
 * @param {object} referencedItem - The BOM item this refers to
 * @param {string} [issue] - Description of the issue
 * @returns {object}
 */
const createShortageConfirmItem = (kind, referencedItem, issue = '') => {
    return {
        severity: 'medium',
        issue: issue || `Item "${referencedItem.item}" requires confirmation`,
        missingInfo: kind === 'new_item_pending' ? 'New item not yet approved' : 'Item removed from import',
        confirmationRequired: kind === 'new_item_pending' 
            ? 'Approve adding this new item to BOM' 
            : 'Confirm this item should be removed',
        owner: 'supervisor',
        resolved: false,
        kind: kind,
        referencedItemId: referencedItem.id,
        referencedItemData: referencedItem
    };
};

/**
 * Merge a new ParsedImport into existing project data
 * @param {number} projectId - Project ID
 * @param {object} parsedImport - ParsedImport from Agent 1
 * @returns {Promise<{updatedItems: Array, shortageConfirmItems: Array, changeLog: Array}>}
 */
export const mergeImport = async (projectId, parsedImport) => {
    const result = {
        updatedItems: [],
        shortageConfirmItems: [],
        changeLog: []
    };
    
    // Get existing BOM items for this project
    const existingItems = await getBomItemsByProject(projectId);
    
    // Track which existing items have been matched
    const matchedExistingIds = new Set();
    
    // Process each item from the new import
    for (const newItem of parsedImport.bomItems) {
        // Find matching existing item by (item name + spec)
        const match = findMatchingItem(existingItems, newItem.item, newItem.spec);
        
        if (match) {
            // Match found - update non-locked fields
            matchedExistingIds.add(match.id);
            
            // Check each field for changes
            const fieldsToCheck = ['item', 'spec', 'category', 'netQty', 'wastagePct', 
                                   'purchaseQty', 'unitCost', 'estTotal', 'basis', 
                                   'confidence', 'notes'];
            
            for (const field of fieldsToCheck) {
                // Skip if field is locked
                if (match.lockedFields && match.lockedFields.includes(field)) {
                    continue;
                }
                
                const oldValue = match[field];
                const newValue = newItem[field];
                
                // Check if value actually changed
                if (oldValue !== newValue) {
                    // Log the change
                    const changeEntry = {
                        projectId,
                        actor: 'agent',
                        field,
                        oldValue,
                        newValue
                    };
                    await createChangeLogEntry(changeEntry);
                    result.changeLog.push(changeEntry);
                    
                    // Update the field
                    await updateBomItem(match.id, { [field]: newValue }, match.lockedFields);
                }
            }
            
            result.updatedItems.push({ id: match.id, ...newItem });
        } else {
            // No match - create ShortageConfirmItem for new item pending approval
            const shortageItem = createShortageConfirmItem('new_item_pending', newItem);
            result.shortageConfirmItems.push(shortageItem);
            // Note: Do NOT add to bomItems yet - waiting for supervisor approval
        }
    }
    
    // Check for existing items that are no longer in the new import
    for (const existingItem of existingItems) {
        if (!matchedExistingIds.has(existingItem.id)) {
            // This existing item has no match in the new import
            const shortageItem = createShortageConfirmItem(
                'removed_item_pending', 
                existingItem,
                `Item "${existingItem.item}" exists in BOM but not in new import`
            );
            result.shortageConfirmItems.push(shortageItem);
            // Note: Do NOT delete the item - it remains in storage until supervisor confirms
        }
    }
    
    return result;
};

/**
 * Lock a field on a BOM item (called when supervisor manually edits)
 * @param {number} itemId - BOM item ID
 * @param {string} fieldName - Field name to lock
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value set by supervisor
 * @param {number} projectId - Project ID
 * @returns {Promise<void>}
 */
export const lockFieldAndLog = async (itemId, fieldName, oldValue, newValue, projectId) => {
    // Add field to lockedFields
    await lockBomItemFields(itemId, [fieldName]);
    
    // Log the change as supervisor action
    await createChangeLogEntry({
        projectId,
        actor: 'supervisor',
        field: fieldName,
        oldValue,
        newValue
    });
};

/**
 * Resolve a shortage/confirm item
 * @param {object} shortageItem - The shortage confirm item
 * @param {boolean} approved - Whether approved
 * @param {number} projectId - Project ID
 * @returns {Promise<{resolved: boolean, action: string}>}
 */
export const resolveShortageConfirm = async (shortageItem, approved, projectId) => {
    if (approved) {
        if (shortageItem.kind === 'new_item_pending') {
            // Add the new item to BOM
            const newItemData = shortageItem.referencedItemData;
            await createBomItem({
                ...newItemData,
                projectId
            });
            return { resolved: true, action: 'added_to_bom' };
        } else if (shortageItem.kind === 'removed_item_pending') {
            // Item stays in BOM (supervisor decided to keep it)
            return { resolved: true, action: 'kept_in_bom' };
        }
    } else {
        if (shortageItem.kind === 'new_item_pending') {
            // Reject adding the new item
            return { resolved: true, action: 'rejected_new_item' };
        } else if (shortageItem.kind === 'removed_item_pending') {
            // Remove the item from BOM
            // Note: Actual deletion would need item ID lookup
            return { resolved: true, action: 'confirmed_removal' };
        }
    }
    
    return { resolved: false, action: 'none' };
};

export default {
    mergeImport,
    lockFieldAndLog,
    resolveShortageConfirm,
    createShortageConfirmItem
};
