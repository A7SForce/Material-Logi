/**
 * projectMatcher.js — Agent 3: match ParsedImport.projectTitle to an existing
 * Project, or flag "create new". Never auto-creates. Deterministic only.
 */
import { listProjects } from '../data/projectRepo.js';

/** Normalize a title for comparison: uppercase, collapse spaces, strip location tail. */
export const normalizeTitle = (title) => {
  const base = String(title ?? '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
  // "SURAU DARUL DAKWAH, BETONG, SARAWAK" -> "SURAU DARUL DAKWAH"
  return base.split(',')[0].trim();
};

/**
 * @returns {Promise<{ action: 'match', project } | { action: 'create_new', normalizedTitle }>}
 */
export const matchProject = async (parsedTitle) => {
  const normalized = normalizeTitle(parsedTitle);
  const projects = await listProjects();
  for (const p of projects) {
    const existing = normalizeTitle(p.name);
    if (!existing) continue;
    // Exact match, or one is the comma-stripped prefix of the other.
    if (existing === normalized || existing.startsWith(normalized) || normalized.startsWith(existing)) {
      return { action: 'match', project: p };
    }
  }
  return { action: 'create_new', normalizedTitle: normalized };
};

export default { matchProject, normalizeTitle };
