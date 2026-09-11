/**
 * ProjectsScreen.jsx — Agent 4 entry screen (outside any project).
 * Lists projects + imports .md/.xlsx into new or matched projects.
 * Wiring only: parse/match/seed decisions live in Agent 1/3 + repos.
 */
import React, { useEffect, useState } from 'react';
import { listProjects, createProject } from '../data/projectRepo.js';
import { parseImport } from '../utils/importParser/index.js';
import { matchProject } from '../logic/projectMatcher.js';
import { mergeParsedImport } from '../logic/mergeEngine.js';
import { seedProjectFromImport } from '../logic/seedProject.js';
import * as bomRepo from '../data/bomRepo.js';
import * as shortageRepo from '../data/shortageRepo.js';
import * as supplierRepo from '../data/supplierRepo.js';
import * as changeLogRepo from '../data/changeLogRepo.js';

const mergeDeps = {
  listBomItems: bomRepo.listBomItems,
  getBomItem: bomRepo.getBomItem,
  updateBomItem: bomRepo.updateBomItem,
  lockField: bomRepo.lockField,
  appendChangeLog: changeLogRepo.appendChangeLog,
  createShortageItem: shortageRepo.createShortageItem,
  listShortageItems: shortageRepo.listShortageItems,
};

const seedDeps = {
  bulkCreateBomItems: bomRepo.bulkCreateBomItems,
  bulkCreateShortageItems: shortageRepo.bulkCreateShortageItems,
  createSupplier: supplierRepo.createSupplier,
  listSuppliers: supplierRepo.listSuppliers,
  linkSupplierToProject: supplierRepo.linkSupplierToProject,
  appendChangeLog: changeLogRepo.appendChangeLog,
};

export default function ProjectsScreen({ onOpenProject }) {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => setProjects(await listProjects());
  useEffect(() => { reload(); }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      const { format, parsed } = await parseImport(file, file.name);
      const match = await matchProject(parsed.projectTitle);
      if (match.action === 'match') {
        const result = await mergeParsedImport(match.project.id, parsed, mergeDeps);
        setStatus(
          `Merged ${format} into "${match.project.name}": ` +
          `${result.updatedCount} updated, ${result.newPendingIds.length} new-pending, ` +
          `${result.removedPendingIds.length} removed-pending, ${result.skippedLocked.length} locked-skipped.`
        );
        await reload();
        onOpenProject(match.project.id);
      } else {
        const project = await createProject({ name: parsed.projectTitle });
        const seed = await seedProjectFromImport(project.id, parsed, seedDeps);
        setStatus(
          `Created "${project.name}": ${seed.bomCount} BOM lines, ` +
          `${seed.shortageCount} confirmations, ${seed.supplierCount} suppliers.`
        );
        await reload();
        onOpenProject(project.id);
      }
    } catch (err) {
      setStatus(`Import failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '1rem' }}>
        <h1>Logistics Helper v3</h1>
        <p style={{ color: 'var(--text-muted)' }}>Deterministic operations tool for construction logistics</p>
      </header>

      <div className="card" style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <h2>Import BOM file</h2>
        <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0' }}>
          Accepts Agent-6 output: <code>.md</code> or <code>.xlsx</code>
        </p>
        <input
          type="file"
          accept=".md,.markdown,.txt,.xlsx,.xls"
          disabled={busy}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {status && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          {status}
        </div>
      )}

      <h2 style={{ marginBottom: '0.5rem' }}>Projects ({projects.length})</h2>
      {projects.map((p) => (
        <div key={p.id} className="card" style={{ marginBottom: '0.5rem' }}>
          <strong>{p.name}</strong>
          <div style={{ marginTop: '0.5rem' }}>
            <button onClick={() => onOpenProject(p.id)}>Open</button>
          </div>
        </div>
      ))}
      {projects.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }}>No projects yet — import a file above.</p>
      )}
    </div>
  );
}
