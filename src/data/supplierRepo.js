/**
 * supplierRepo.js — Agent 2: CRUD for GlobalSupplier + ProjectSupplierLink.
 */
import db from './db.js';
import { generateId } from '../utils/helpers.js';

export const createSupplier = async (partial) => {
  const row = {
    id: partial.id ?? generateId(),
    businessName: partial.businessName ?? null,
    contact: partial.contact ?? null,
    address: partial.address ?? null,
    specialty: partial.specialty ?? null,
    sourceUrl: partial.sourceUrl ?? null,
    tags: Array.isArray(partial.tags) ? [...partial.tags] : [],
  };
  await db.globalSuppliers.add(row);
  return row;
};

export const bulkCreateSuppliers = async (partials) => {
  const rows = partials.map((p) => ({
    id: p.id ?? generateId(),
    businessName: p.businessName ?? null,
    contact: p.contact ?? null,
    address: p.address ?? null,
    specialty: p.specialty ?? null,
    sourceUrl: p.sourceUrl ?? null,
    tags: Array.isArray(p.tags) ? [...p.tags] : [],
  }));
  await db.globalSuppliers.bulkAdd(rows);
  return rows;
};

export const listSuppliers = () => db.globalSuppliers.toArray();

export const getSupplier = (id) => db.globalSuppliers.get(id);

export const updateSupplier = async (id, patch) => {
  await db.globalSuppliers.update(id, patch);
  return db.globalSuppliers.get(id);
};

export const linkSupplierToProject = async ({ projectId, globalSupplierId, assignedToItemId = null }) => {
  const link = { projectId, globalSupplierId, assignedToItemId };
  await db.supplierLinks.put(link);
  return link;
};

export const listProjectSuppliers = (projectId) =>
  db.supplierLinks.where('projectId').equals(projectId).toArray();

export const unlinkSupplier = (projectId, globalSupplierId) =>
  db.supplierLinks.delete([projectId, globalSupplierId]);

export default {
  createSupplier,
  bulkCreateSuppliers,
  getSupplier,
  listSuppliers,
  updateSupplier,
  linkSupplierToProject,
  listProjectSuppliers,
  unlinkSupplier,
};
