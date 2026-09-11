/**
 * projectRepo.js — CRUD operations for Project table
 */

import db from './db.js';

/**
 * Create a new project
 * @param {object} project - { name, location }
 * @returns {Promise<number>} - Project ID
 */
export const createProject = async (project) => {
    const now = Date.now();
    return await db.projects.add({
        name: project.name,
        location: project.location || '',
        createdAt: now
    });
};

/**
 * Get all projects
 * @returns {Promise<Array>}
 */
export const getAllProjects = async () => {
    return await db.projects.toArray();
};

/**
 * Get project by ID
 * @param {number} id - Project ID
 * @returns {Promise<object|null>}
 */
export const getProjectById = async (id) => {
    return await db.projects.get(id);
};

/**
 * Get project by name (case-insensitive)
 * @param {string} name - Project name
 * @returns {Promise<object|null>}
 */
export const getProjectByName = async (name) => {
    const projects = await db.projects.filter(p => 
        p.name.toLowerCase() === name.toLowerCase()
    ).toArray();
    return projects.length > 0 ? projects[0] : null;
};

/**
 * Update project
 * @param {number} id - Project ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateProject = async (id, updates) => {
    await db.projects.update(id, updates);
};

/**
 * Delete project and all related data
 * @param {number} id - Project ID
 * @returns {Promise<void>}
 */
export const deleteProject = async (id) => {
    await db.transaction('rw', db.projects, db.bomItems, db.shortageConfirmItems, db.projectSupplierLinks, db.changeLogEntries, async () => {
        await db.bomItems.where('projectId').equals(id).delete();
        await db.shortageConfirmItems.where('projectId').equals(id).delete();
        await db.projectSupplierLinks.where('projectId').equals(id).delete();
        await db.changeLogEntries.where('projectId').equals(id).delete();
        await db.projects.delete(id);
    });
};

export default {
    createProject,
    getAllProjects,
    getProjectById,
    getProjectByName,
    updateProject,
    deleteProject
};
