/**
 * DashboardScreen.jsx — Agent 4: project overview.
 * Ready/Blocked badge reads the live Confirm count; change log renders as
 * plain sentences (never storage field names). Wiring only.
 */
import React, { useEffect, useState } from 'react';
import { getProject } from '../data/projectRepo.js';
import { listBomItems } from '../data/bomRepo.js';
import { countUnresolved } from '../data/shortageRepo.js';
import { listProjectSuppliers } from '../data/supplierRepo.js';
import { listChangeLog } from '../data/changeLogRepo.js';
import { formatCurrency } from '../utils/helpers.js';

const shortDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Storage row -> plain site-diary sentence. No field names leak to the screen. */
export const changeSentence = (c) => {
  const when = shortDate(c.timestamp);
  const who = c.actor === 'supervisor' ? 'Supervisor' : 'Agent';
  if (c.field === 'import_note') return `${who} note · ${when}: ${c.newValue}`;
  return `${who} · ${when}: ${c.field}: ${String(c.oldValue)} → ${String(c.newValue)}`;
};

export default function DashboardScreen({ projectId, onGoConfirm }) {
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState({ lines: 0, total: 0, open: 0, suppliers: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    (async () => {
      const [p, items, open, links, log] = await Promise.all([
        getProject(projectId),
        listBomItems(projectId),
        countUnresolved(projectId),
        listProjectSuppliers(projectId),
        listChangeLog(projectId),
      ]);
      setProject(p);
      setStats({
        lines: items.length,
        total: items.reduce((s, i) => s + Number(i.estTotal || 0), 0),
        open,
        suppliers: links.length,
      });
      setRecent(log.slice(-5).reverse());
    })();
  }, [projectId]);

  if (!project) return <div className="container"><p>Loading project…</p></div>;

  return (
    <div className="container">
      <h1>{project.name}</h1>
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
      <div className="card" style={{ margin: '1rem 0' }}>
        <div><strong>Material lines:</strong> {stats.lines}</div>
        <div><strong>Est. total:</strong> <span className="money">{formatCurrency(stats.total)}</span></div>
        <div><strong>Open confirmations:</strong> {stats.open}</div>
        <div><strong>Linked suppliers:</strong> {stats.suppliers}</div>
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
