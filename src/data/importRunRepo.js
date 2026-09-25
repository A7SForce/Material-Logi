/**
 * importRunRepo.js — Lane 1A: CRUD for ImportRun (passive trust scorecard).
 * Records every import's verify pass. Never read by merge/seed/import logic —
 * display-only history (Dashboard import-check card, CSV banner).
 */
import db from './db.js';
import { defaultImportRun } from './schema.js';
import { generateId } from '../utils/helpers.js';

export const createImportRun = async (partial) => {
  const row = defaultImportRun({
    ...partial,
    id: partial.id ?? generateId(),
    timestamp: partial.timestamp ?? new Date().toISOString(),
  });
  if (!row.fileType) throw new Error('createImportRun: fileType is required (md | xlsx | csv)');
  await db.importRuns.add(row);
  return row;
};

/** All runs for a project (or all runs when projectId is null), newest first. */
export const listImportRuns = async (projectId = null) => {
  const rows = projectId === null
    ? await db.importRuns.toArray()
    : await db.importRuns.where('projectId').equals(projectId).toArray();
  return rows.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
};

/** Newest run of any type for a project (or globally when projectId is null). */
export const latestImportRun = async (projectId = null) => {
  const rows = await listImportRuns(projectId);
  return rows.length > 0 ? rows[0] : null;
};

/** Newest BOM import (md/xlsx) for a project — the Dashboard "import check". */
export const latestBomImportRun = async (projectId) => {
  const rows = await listImportRuns(projectId);
  return rows.find((r) => r.fileType === 'md' || r.fileType === 'xlsx') || null;
};

export default { createImportRun, listImportRuns, latestImportRun, latestBomImportRun };
