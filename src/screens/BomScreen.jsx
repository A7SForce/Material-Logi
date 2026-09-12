/**
 * BomScreen.jsx — Agent 4: BOM as a one-handed row list.
 * Supervisor edits go through mergeEngine.supervisorEdit (locks + supervisor log).
 * Value cells are real controls: role="button", keyboard-operable, 48px targets.
 */
import React, { useEffect, useState } from 'react';
import { listBomItems } from '../data/bomRepo.js';
import * as bomRepo from '../data/bomRepo.js';
import { appendChangeLog } from '../data/changeLogRepo.js';
import { supervisorEdit } from '../logic/mergeEngine.js';
import { formatCurrency, formatNumber } from '../utils/helpers.js';

const editDeps = {
  getBomItem: bomRepo.getBomItem,
  lockField: bomRepo.lockField,
  updateBomItem: bomRepo.updateBomItem,
  appendChangeLog,
};

const activate = (fn) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

export default function BomScreen({ projectId }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // { id, field, value, type }
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const reload = async () => setItems(await listBomItems(projectId));
  useEffect(() => { reload(); }, [projectId]);

  const openEditor = (item, field, type) =>
    setEditing({ id: item.id, field, value: item[field] ?? '', type });

  const saveEdit = async () => {
    if (!editing || saving) return;
    setSaving(true);
    const num = editing.type === 'number' ? Number(editing.value) : editing.value;
    try {
      await supervisorEdit(editing.id, editing.field, num, editDeps);
      setNotice(`Saved. ${editing.field} locked — future imports won't overwrite it.`);
      setEditing(null);
      await reload();
    } catch (err) {
      setNotice(`Couldn't save — still draft. ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <h1>BOM ({items.length})</h1>
      {notice && <div className="card" role="status" style={{ margin: '0.5rem 0' }}>{notice}</div>}
      {items.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No items yet.</p>}

      <div className="rowlist">
        {items.map((item) => {
          const locked = Array.isArray(item.lockedFields) ? item.lockedFields : [];
          return (
            <div key={item.id} className="row">
              <div>
                <strong>{item.item}</strong>{' '}
                {locked.length > 0 && (
                  <span className="badge">🔒 {locked.join(', ')}</span>
                )}
              </div>
              <div className="small" style={{ color: 'var(--text-muted)' }}>
                {[item.spec, item.category].filter(Boolean).join(' · ')}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'baseline' }}>
                <div
                  className="cell"
                  role="button"
                  tabIndex={0}
                  aria-label={`Edit purchase quantity, currently ${item.purchaseQty ?? 'empty'} ${item.unit || ''}`}
                  title="Tap to edit purchase quantity"
                  onClick={() => openEditor(item, 'purchaseQty', 'number')}
                  onKeyDown={activate(() => openEditor(item, 'purchaseQty', 'number'))}
                >
                  <div className="small" style={{ color: 'var(--text-muted)' }}>Qty</div>
                  <div className="money">
                    {formatNumber(item.purchaseQty)}{locked.includes('purchaseQty') ? ' 🔒' : ''}
                  </div>
                </div>
                <div
                  className="cell"
                  role="button"
                  tabIndex={0}
                  aria-label={`Edit unit cost, currently ${item.unitCost ?? 'empty'}`}
                  title="Tap to edit unit cost"
                  onClick={() => openEditor(item, 'unitCost', 'number')}
                  onKeyDown={activate(() => openEditor(item, 'unitCost', 'number'))}
                >
                  <div className="small" style={{ color: 'var(--text-muted)' }}>Price</div>
                  <div className="money">
                    {formatCurrency(item.unitCost)}{locked.includes('unitCost') ? ' 🔒' : ''}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div className="small" style={{ color: 'var(--text-muted)' }}>Total</div>
                  <div className="money"><strong>{formatCurrency(item.estTotal)}</strong></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="card anim-panel" style={{ marginTop: '1rem' }}>
          <h3>Edit {editing.field} (will lock the field)</h3>
          <label className="small" htmlFor="bom-edit-input">New value</label>
          <input
            id="bom-edit-input"
            autoFocus
            type={editing.type}
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
          />
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save + lock'}</button>
            <button className="secondary" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
