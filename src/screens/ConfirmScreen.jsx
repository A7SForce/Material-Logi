/**
 * ConfirmScreen.jsx — Agent 4: shortage/confirmation queue, grouped by kind.
 * Approve/Dismiss delegate to logic/approvePending (the screen decides nothing).
 * Group copy states each action's consequence; Dismiss never changes the BOM.
 */
import React, { useEffect, useState } from 'react';
import { listShortageItems } from '../data/shortageRepo.js';
import * as shortageRepo from '../data/shortageRepo.js';
import * as bomRepo from '../data/bomRepo.js';
import { approvePendingItem, rejectPendingItem } from '../logic/approvePending.js';

const approveDeps = {
  getShortageItem: shortageRepo.getShortageItem,
  resolveShortageItem: shortageRepo.resolveShortageItem,
  createBomItem: bomRepo.createBomItem,
  listBomItems: bomRepo.listBomItems,
  deleteBomItem: bomRepo.deleteBomItem,
};

const GROUPS = [
  {
    kind: 'agent_question',
    title: 'Questions from the agent',
    hint: 'Answer by resolving. Nothing is added or removed.',
    approveLabel: 'Mark resolved',
  },
  {
    kind: 'new_item_pending',
    title: 'New items from the latest import',
    hint: 'Approve adds the item to the BOM. Dismiss leaves the BOM unchanged.',
    approveLabel: 'Approve — add to BOM',
  },
  {
    kind: 'removed_item_pending',
    title: 'Missing from the latest import',
    hint: 'Approve removes the item from the BOM. Dismiss leaves the BOM unchanged.',
    approveLabel: 'Approve — remove from BOM',
  },
];

const SEVERITY_BADGE = { HIGH: 'severity-high', MEDIUM: 'severity-medium', LOW: '' };

export default function ConfirmScreen({ projectId, onChanged }) {
  const [items, setItems] = useState([]);
  const [notice, setNotice] = useState(null);

  const reload = async () => setItems(await listShortageItems(projectId, { resolved: false }));
  useEffect(() => { reload(); }, [projectId]);

  const act = async (fn, label) => {
    try {
      const r = await fn();
      setNotice(`${label}: ${r.action}`);
      await reload();
      if (onChanged) onChanged();
    } catch (err) {
      setNotice(`Failed: ${err.message}`);
    }
  };

  return (
    <div className="container">
      <h1>Confirm ({items.length} open)</h1>
      {notice && <div className="card" role="status" style={{ margin: '0.5rem 0' }}>{notice}</div>}
      {items.length === 0 && (
        <div className="card"><span className="badge status-ready">Ready — nothing outstanding, PO is unlocked.</span></div>
      )}
      {GROUPS.map((g) => {
        const rows = items.filter((s) => s.kind === g.kind);
        if (rows.length === 0) return null;
        return (
          <section key={g.kind} aria-label={g.title} style={{ marginTop: '1rem' }}>
            <h2>{g.title} ({rows.length})</h2>
            <p className="small" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{g.hint}</p>
            {rows.map((s) => (
              <div key={s.id} className="card" style={{ marginBottom: '0.5rem' }}>
                <div>
                  <span className={`badge ${SEVERITY_BADGE[s.severity] || ''}`}>{s.severity}</span>
                  {' '}<span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{s.owner}</span>
                </div>
                <strong>{s.issue}</strong>
                {s.missingInfo && <div>Missing: {s.missingInfo}</div>}
                {s.confirmationRequired && <div>Needed: {s.confirmationRequired}</div>}
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => act(() => approvePendingItem(s.id, projectId, approveDeps), 'Approved')}>
                    {g.approveLabel}
                  </button>
                  <button
                    className="secondary"
                    title="Dismiss (leaves the BOM unchanged)"
                    onClick={() => act(() => rejectPendingItem(s.id, { resolveShortageItem: shortageRepo.resolveShortageItem }), 'Dismissed')}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
