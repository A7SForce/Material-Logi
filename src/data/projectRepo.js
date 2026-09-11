/**
 * projectRepo.js — Agent 2: CRUD for Project. No business logic.
 */
import db from './db.js';
import { generateId } from '../utils/helpers.js';

export const createProject = async ({ name, location = null }) => {
  const row = {
    id: generateId(),
    name,
    location,
    createdAt: new Date().toISOString(),
  };
  await db.projects.add(row);
  return row;
};

export const getProject = (id) => db.projects.get(id);

export const listProjects = () => db.projects.orderBy('createdAt').reverse().toArray();

export const updateProject = async (id, patch) => {
  await db.projects.update(id, patch);
  return db.projects.get(id);
};

export const deleteProject = async (id) => {
  // Cascade: remove rows that belong to this project.
  await db.transaction(
    'rw',
    [db.projects, db.bomItems, db.shortageItems, db.supplierLinks, db.changeLog],
    async () => {
      await db.bomItems.where('projectId').equals(id).delete();
      await db.shortageItems.where('projectId').equals(id).delete();
      await db.supplierLinks.where('projectId').equals(id).delete();
      await db.changeLog.where('projectId').equals(id).delete();
      await db.projects.delete(id);
    }
  );
};

export default { createProject, getProject, listProjects, updateProject, deleteProject };
