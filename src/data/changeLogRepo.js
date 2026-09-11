/**
 * changeLogRepo.js — Append-only changelog writer/reader
 */

import db from './db.js';

/**
 * Create a new changelog entry
 * @param {object} entry - { projectId, actor, field, oldValue, newValue }
 * @returns {Promise<number>} - Entry ID
 */
export const createChangeLogEntry = async (entry) => {
    return await db.changeLogEntries.add({
        projectId: entry.projectId,
        timestamp: Date.now(),
        actor: entry.actor || 'agent', // 'agent' | 'supervisor'
        field: entry.field || '',
        oldValue: entry.oldValue !== undefined ? entry.oldValue : null,
        newValue: entry.newValue !== undefined ? entry.newValue : null
    });
};

/**
 * Get all changelog entries for a project
 * @param {number} projectId - Project ID
 * @returns {Promise<Array>}
 */
export const getChangeLogByProject = async (projectId) => {
    return await db.changeLogEntries
        .where('projectId')
        .equals(projectId)
        .sortBy('timestamp');
};

/**
 * Get changelog entries for a specific item/field
 * @param {number} projectId - Project ID
 * @param {string} field - Field name
 * @returns {Promise<Array>}
 */
export const getChangeLogByField = async (projectId, field) => {
    return await db.changeLogEntries
        .filter(entry => entry.projectId === projectId && entry.field === field)
        .sortBy('timestamp');
};

/**
 * Get recent changelog entries (last N entries)
 * @param {number} projectId - Project ID
 * @param {number} limit - Max entries to return
 * @returns {Promise<Array>}
 */
export const getRecentChangeLog = async (projectId, limit = 50) => {
    const entries = await db.changeLogEntries
        .where('projectId')
        .equals(projectId)
        .reverse()
        .limit(limit)
        .toArray();
    return entries.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Get changelog entries by actor type
 * @param {number} projectId - Project ID
 * @param {string} actor - 'agent' or 'supervisor'
 * @returns {Promise<Array>}
 */
export const getChangeLogByActor = async (projectId, actor) => {
    return await db.changeLogEntries
        .filter(entry => entry.projectId === projectId && entry.actor === actor)
        .sortBy('timestamp');
};

/**
 * Clear changelog for a project (use with caution)
 * @param {number} projectId - Project ID
 * @returns {Promise<void>}
 */
export const clearChangeLog = async (projectId) => {
    await db.changeLogEntries.where('projectId').equals(projectId).delete();
};

export default {
    createChangeLogEntry,
    getChangeLogByProject,
    getChangeLogByField,
    getRecentChangeLog,
    getChangeLogByActor,
    clearChangeLog
};
