/**
 * itemMatcher.js — Match items by (item name + spec) text, case-insensitive
 */

/**
 * Normalize item name and spec for matching
 * @param {string} item - Item name
 * @param {string} spec - Specification
 * @returns {string} - Normalized match key
 */
const createMatchKey = (item, spec) => {
    const normalizedItem = (item || '').toLowerCase().trim();
    const normalizedSpec = (spec || '').toLowerCase().trim();
    return `${normalizedItem}|${normalizedSpec}`;
};

/**
 * Find a matching existing item by item name and spec
 * @param {Array} existingItems - Array of existing BOM items
 * @param {string} newItemName - New item's name
 * @param {string} newItemSpec - New item's spec
 * @returns {object|null} - Matching item or null
 */
export const findMatchingItem = (existingItems, newItemName, newItemSpec) => {
    if (!Array.isArray(existingItems) || existingItems.length === 0) {
        return null;
    }
    
    const newKey = createMatchKey(newItemName, newItemSpec);
    
    for (const existing of existingItems) {
        const existingKey = createMatchKey(existing.item, existing.spec);
        if (existingKey === newKey) {
            return existing;
        }
    }
    
    return null;
};

/**
 * Find all unmatched items between new import and existing set
 * @param {Array} existingItems - Array of existing BOM items
 * @param {Array} newItems - Array of new BOM items from import
 * @returns {{newUnmatched: Array, existingUnmatched: Array}}
 */
export const findUnmatchedItems = (existingItems, newItems) => {
    const result = {
        newUnmatched: [], // Items in new import that don't exist
        existingUnmatched: [] // Items in existing that are not in new import
    };
    
    // Find new items without matches
    for (const newItem of newItems) {
        const match = findMatchingItem(existingItems, newItem.item, newItem.spec);
        if (!match) {
            result.newUnmatched.push(newItem);
        }
    }
    
    // Find existing items without matches in new import
    for (const existingItem of existingItems) {
        let hasMatch = false;
        for (const newItem of newItems) {
            if (findMatchingItem([newItem], newItem.item, newItem.spec)) {
                hasMatch = true;
                break;
            }
        }
        if (!hasMatch) {
            result.existingUnmatched.push(existingItem);
        }
    }
    
    return result;
};

/**
 * Check if two items match by name and spec
 * @param {object} item1 - First item
 * @param {object} item2 - Second item
 * @returns {boolean}
 */
export const itemsMatch = (item1, item2) => {
    const key1 = createMatchKey(item1.item, item1.spec);
    const key2 = createMatchKey(item2.item, item2.spec);
    return key1 === key2;
};

export default {
    findMatchingItem,
    findUnmatchedItems,
    itemsMatch,
    createMatchKey
};
