/**
 * ConfirmScreen.jsx — Agent 4: shortage/confirmation queue.
 * Approve/Dismiss delegate to logic/approvePending (the screen decides nothing).
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

const KIND_LABEL = {
  agent_question: 'Question',
  new_item_pending: 'New item',
  removed_item_pending: 'Removed item',
};

export default function ConfirmScreen({ projectId, onChanged }) {
  const [items, setItems] = useState([]);
  const [notice, setNotice] = useState(null);

  const reload = async () => setItems(await listShortageItems(projectId, { resolved: false }));
  useEffect(() => { reload(); }, [projectId]);

  const act = async (fn, id, label) => {
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
      {notice && <div className="card" style={{ margin: '0.5rem 0' }}>{notice}</div>}
      {items.length === 0 && (
        <div className="card"><span className="text-success">✓ Nothing outstanding — PO is unlocked.</span></div>
      )}
      {items.map((s) => (
        <div key={s.id} className="card" style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            [{s.severity}] · {KIND_LABEL[s.kind] || s.kind} · {s.owner}
          </div>
          <strong>{s.issue}</strong>
          {s.missingInfo && <div>Missing: {s.missingInfo}</div>}
          {s.confirmationRequired && <div>Needed: {s.confirmationRequired}</div>}
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => act(() => approvePendingItem(s.id, projectId, approveDeps), s.id, 'Approved')}>
              {s.kind === 'agent_question' ? 'Mark resolved' : 'Approve'}
            </button>
            <button onClick={() => act(() => rejectPendingItem(s.id, { resolveShortageItem: shortageRepo.resolveShortageItem }), s.id, 'Dismissed')}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
