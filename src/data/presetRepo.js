/**
 * presetRepo.js — Agent 2: CRUD for ItemSupplierPreset.
 * Supervisor-set memory ("always use this supplier for [item]"), global across
 * projects. Explicit and deterministic — never learned or inferred.
 * PK is the itemKey itself, so setPreset is a natural upsert.
 */
import db from './db.js';

export const getPreset = (itemKey) => db.presets.get(itemKey);

export const setPreset = async (itemKey, globalSupplierId) => {
  const row = {
    id: itemKey,
    itemKey,
    globalSupplierId,
    updatedAt: new Date().toISOString(),
  };
  await db.presets.put(row);
  return row;
};

export const deletePreset = (itemKey) => db.presets.delete(itemKey);

export const listPresets = () => db.presets.toArray();

export const clearPresets = () => db.presets.clear();

export default { getPreset, setPreset, deletePreset, listPresets, clearPresets };
