/**
 * itemMatcher.js — Agent 3: match items by (item name + spec) text, case-insensitive.
 * Pure functions. No storage access.
 */

/** Canonical match key for an item row. */
export const itemKey = (itemName, spec) => {
  const norm = (s) =>
    String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  return `${norm(itemName)}|${norm(spec)}`;
};

/** Find an existing BomItem matching (itemName, spec). Returns row or null. */
export const findMatch = (existingItems, itemName, spec) => {
  const key = itemKey(itemName, spec);
  for (const row of existingItems) {
    if (itemKey(row.item, row.spec) === key) return row;
  }
  return null;
};

export default { itemKey, findMatch };
