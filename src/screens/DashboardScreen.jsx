/**
 * DashboardScreen.jsx — Agent 4: project overview. Read-only wiring of repos.
 */
import React, { useEffect, useState } from 'react';
import { getProject } from '../data/projectRepo.js';
import { listBomItems } from '../data/bomRepo.js';
import { countUnresolved } from '../data/shortageRepo.js';
import { listProjectSuppliers } from '../data/supplierRepo.js';
import { listChangeLog } from '../data/changeLogRepo.js';
import { formatCurrency } from '../utils/helpers.js';

export default function DashboardScreen({ projectId }) {
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

  if (!project) return <div className="container"><p>Loading…</p></div>;

  return (
    <div className="container">
      <h1>{project.name}</h1>
      <div className="card" style={{ margin: '1rem 0' }}>
        <div><strong>Material lines:</strong> {stats.lines}</div>
        <div><strong>Est. total:</strong> {formatCurrency(stats.total)}</div>
        <div><strong>Open confirmations:</strong> {stats.open}</div>
        <div><strong>Linked suppliers:</strong> {stats.suppliers}</div>
      </div>
      <h2>Recent changes</h2>
      {recent.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No changes logged yet.</p>}
      {recent.map((c) => (
        <div key={c.id} className="card" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{c.timestamp} · {c.actor}</span><br />
          <strong>{c.field}</strong>: {String(c.oldValue)} → {String(c.newValue)}
        </div>
      ))}
    </div>
  );
}
