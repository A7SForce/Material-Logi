/**
 * projectMatcher.js — Match ParsedImport.projectTitle to an existing Project
 */

import { getProjectByName, createProject } from '../data/projectRepo.js';

/**
 * Match a parsed import's project title to an existing project
 * @param {string} projectTitle - Title from ParsedImport
 * @returns {Promise<{matched: boolean, project?: object, action: 'use_existing' | 'create_new'}>}
 */
export const matchProject = async (projectTitle) => {
    if (!projectTitle || typeof projectTitle !== 'string') {
        return {
            matched: false,
            action: 'create_new',
            reason: 'Invalid or empty project title'
        };
    }

    // Normalize the title for matching (trim, lowercase for comparison)
    const normalizedTitle = projectTitle.trim();
    
    // Try to find existing project by name
    const existingProject = await getProjectByName(normalizedTitle);
    
    if (existingProject) {
        return {
            matched: true,
            project: existingProject,
            action: 'use_existing'
        };
    }
    
    // No match found - signal that a new project should be created
    return {
        matched: false,
        action: 'create_new',
        suggestedName: normalizedTitle
    };
};

/**
 * Ensure a project exists, creating one if necessary
 * @param {string} projectTitle - Title from ParsedImport
 * @param {string} [location] - Optional location
 * @returns {Promise<object>} - The project (existing or newly created)
 */
export const ensureProject = async (projectTitle, location = '') => {
    const matchResult = await matchProject(projectTitle);
    
    if (matchResult.matched) {
        return matchResult.project;
    }
    
    // Create new project
    const projectId = await createProject({
        name: matchResult.suggestedName || projectTitle,
        location
    });
    
    return {
        id: projectId,
        name: matchResult.suggestedName || projectTitle,
        location,
        createdAt: Date.now()
    };
};

export default {
    matchProject,
    ensureProject
};
