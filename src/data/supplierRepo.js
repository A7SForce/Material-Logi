/**
 * supplierRepo.js — CRUD operations for GlobalSupplier and ProjectSupplierLink tables
 */

import db from './db.js';

// ── Global Supplier ─────────────────────────────────────────────────────────

/**
 * Create a new global supplier
 * @param {object} supplier - Supplier data
 * @returns {Promise<number>} - Supplier ID
 */
export const createGlobalSupplier = async (supplier) => {
    return await db.globalSuppliers.add({
        businessName: supplier.businessName || '',
        contact: supplier.contact || '',
        address: supplier.address || '',
        specialty: supplier.specialty || '',
        sourceUrl: supplier.sourceUrl || '',
        tags: supplier.tags || []
    });
};

/**
 * Get all global suppliers
 * @returns {Promise<Array>}
 */
export const getAllGlobalSuppliers = async () => {
    return await db.globalSuppliers.toArray();
};

/**
 * Get global supplier by ID
 * @param {number} id - Supplier ID
 * @returns {Promise<object|null>}
 */
export const getGlobalSupplierById = async (id) => {
    return await db.globalSuppliers.get(id);
};

/**
 * Find global supplier by business name (case-insensitive)
 * @param {string} businessName - Business name
 * @returns {Promise<object|null>}
 */
export const findGlobalSupplierByName = async (businessName) => {
    const suppliers = await db.globalSuppliers
        .filter(s => s.businessName.toLowerCase() === businessName.toLowerCase())
        .toArray();
    return suppliers.length > 0 ? suppliers[0] : null;
};

/**
 * Update global supplier
 * @param {number} id - Supplier ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateGlobalSupplier = async (id, updates) => {
    await db.globalSuppliers.update(id, updates);
};

/**
 * Delete global supplier
 * @param {number} id - Supplier ID
 * @returns {Promise<void>}
 */
export const deleteGlobalSupplier = async (id) => {
    // First remove all links to this supplier
    await db.projectSupplierLinks.where('globalSupplierId').equals(id).delete();
    await db.globalSuppliers.delete(id);
};

// ── Project-Supplier Link ───────────────────────────────────────────────────

/**
 * Create a project-supplier link
 * @param {object} link - { projectId, globalSupplierId, assignedToItemId? }
 * @returns {Promise<void>}
 */
export const createProjectSupplierLink = async (link) => {
    await db.projectSupplierLinks.add({
        projectId: link.projectId,
        globalSupplierId: link.globalSupplierId,
        assignedToItemId: link.assignedToItemId || null
    });
};

/**
 * Get all supplier links for a project
 * @param {number} projectId - Project ID
 * @returns {Promise<Array>}
 */
export const getProjectSupplierLinks = async (projectId) => {
    return await db.projectSupplierLinks.where('projectId').equals(projectId).toArray();
};

/**
 * Get supplier links for a specific BOM item
 * @param {number} projectId - Project ID
 * @param {number} itemId - BOM item ID
 * @returns {Promise<Array>}
 */
export const getSupplierLinksForItem = async (projectId, itemId) => {
    return await db.projectSupplierLinks
        .filter(link => link.projectId === projectId && link.assignedToItemId === itemId)
        .toArray();
};

/**
 * Update a project-supplier link
 * @param {number} projectId - Project ID
 * @param {number} globalSupplierId - Supplier ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateProjectSupplierLink = async (projectId, globalSupplierId, updates) => {
    const link = await db.projectSupplierLinks.get({ projectId, globalSupplierId });
    if (!link) return;
    await db.projectSupplierLinks.update([projectId, globalSupplierId], updates);
};

/**
 * Delete a project-supplier link
 * @param {number} projectId - Project ID
 * @param {number} globalSupplierId - Supplier ID
 * @returns {Promise<void>}
 */
export const deleteProjectSupplierLink = async (projectId, globalSupplierId) => {
    await db.projectSupplierLinks.delete([projectId, globalSupplierId]);
};

/**
 * Remove all supplier links for a project
 * @param {number} projectId - Project ID
 * @returns {Promise<void>}
 */
export const deleteAllProjectSupplierLinks = async (projectId) => {
    await db.projectSupplierLinks.where('projectId').equals(projectId).delete();
};

export default {
    // Global Supplier
    createGlobalSupplier,
    getAllGlobalSuppliers,
    getGlobalSupplierById,
    findGlobalSupplierByName,
    updateGlobalSupplier,
    deleteGlobalSupplier,
    // Project-Supplier Link
    createProjectSupplierLink,
    getProjectSupplierLinks,
    getSupplierLinksForItem,
    updateProjectSupplierLink,
    deleteProjectSupplierLink,
    deleteAllProjectSupplierLinks
};
