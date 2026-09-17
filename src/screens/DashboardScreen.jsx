/**
 * DashboardScreen.jsx — Agent 4: project overview.
 * Ready/Blocked badge reads the live Confirm count; change log renders as
 * plain sentences (never storage field names). Wiring only.
 */
import React, { useEffect, useState } from 'react';
import { getProject, updateProject } from '../data/projectRepo.js';
import { listBomItems } from '../data/bomRepo.js';
import { countUnresolved } from '../data/shortageRepo.js';
import { listProjectSuppliers } from '../data/supplierRepo.js';
import { listChangeLog } from '../data/changeLogRepo.js';
import { formatCurrency, formatShortDate } from '../utils/helpers.js';

/** Storage row -> plain site-diary sentence. No field names leak to the screen. */
export const changeSentence = (c) => {
  const when = formatShortDate(c.timestamp);
  const who = c.actor === 'supervisor' ? 'Supervisor' : 'Agent';
  if (c.field === 'import_note') return `${who} note · ${when}: ${c.newValue}`;
  return `${who} · ${when}: ${c.field}: ${String(c.oldValue)} → ${String(c.newValue)}`;
};

export default function DashboardScreen({ projectId, onGoConfirm }) {
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState({ lines: 0, total: 0, open: 0, suppliers: 0 });
  const [recent, setRecent] = useState([]);
  const [clientDraft, setClientDraft] = useState('');
  const [clientSaved, setClientSaved] = useState(false);

  const reload = async () => {
    const [p, items, open, links, log] = await Promise.all([
      getProject(projectId),
      listBomItems(projectId),
      countUnresolved(projectId),
      listProjectSuppliers(projectId),
      listChangeLog(projectId),
    ]);
    setProject(p);
    if (p) setClientDraft(p.client || '');
    setStats({
      lines: items.length,
      total: items.reduce((s, i) => s + Number(i.estTotal || 0), 0),
      open,
      suppliers: links.length,
    });
    setRecent(log.slice(-5).reverse());
  };

  useEffect(() => { reload(); }, [projectId]);

  const saveClient = async () => {
    await updateProject(projectId, { client: clientDraft.trim() ? clientDraft.trim() : null });
    setClientSaved(true);
    await reload();
  };

  if (!project) return <div className="container"><p>Loading project…</p></div>;

  return (
    <div className="container">
      <header className="page-header compact">
        <p className="eyebrow">Project overview</p>
        <h1>{project.name}</h1>
      </header>
      {stats.open > 0 ? (
        <div className="banner blocked" role="alert" style={{ marginTop: '1rem' }}>
          <strong>Blocked — {stats.open} open.</strong> PO stays locked until Confirm is clear.
          <div style={{ marginTop: '0.5rem' }}>
            <button onClick={onGoConfirm}>Go to Confirm</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <span className="badge status-ready">Ready — PO unlocked</span>
        </div>
      )}
      <div className="card dashboard-card">
        <div className="stat-grid">
          <div className="stat"><span>Material lines</span><strong>{stats.lines}</strong></div>
          <div className="stat"><span>Est. total</span><strong className="money">{formatCurrency(stats.total)}</strong></div>
          <div className="stat"><span>To confirm</span><strong>{stats.open}</strong></div>
          <div className="stat"><span>Suppliers</span><strong>{stats.suppliers}</strong></div>
        </div>
        <div className="project-detail"><strong>Client:</strong> {project.client || '—'}</div>
        <div style={{ marginTop: '0.5rem' }}>
          <label className="small" htmlFor="client-input">Client (optional, manual entry)</label>
          <input
            id="client-input"
            value={clientDraft}
            onChange={(e) => { setClientDraft(e.target.value); setClientSaved(false); }}
            placeholder="e.g. TUAN DIN"
            style={{ width: '100%', marginTop: '0.25rem' }}
          />
          <button onClick={saveClient} style={{ marginTop: '0.5rem' }}>Save client</button>
          {clientSaved && <span role="status" style={{ marginLeft: '0.5rem' }}>Saved.</span>}
        </div>
      </div>
      <h2>Recent changes</h2>
      {recent.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No changes logged yet.</p>}
      {recent.map((c) => (
        <div key={c.id} className="card" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          {changeSentence(c)}
        </div>
      ))}
    </div>
  );
}
