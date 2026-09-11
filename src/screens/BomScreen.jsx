/**
 * BomScreen.jsx — Agent 4: BOM table. Supervisor edits go through
 * mergeEngine.supervisorEdit (which locks the field + logs actor "supervisor").
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

const EDITABLE = [
  { field: 'purchaseQty', label: 'Purchase qty', type: 'number' },
  { field: 'unitCost', label: 'Unit cost', type: 'number' },
];

export default function BomScreen({ projectId }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // { id, field, value }
  const [notice, setNotice] = useState(null);

  const reload = async () => setItems(await listBomItems(projectId));
  useEffect(() => { reload(); }, [projectId]);

  const openEditor = (item, field, type) =>
    setEditing({ id: item.id, field, value: item[field] ?? '', type });

  const saveEdit = async () => {
    if (!editing) return;
    const num = editing.type === 'number' ? Number(editing.value) : editing.value;
    try {
      await supervisorEdit(editing.id, editing.field, num, editDeps);
      setNotice(`Saved + locked ${editing.field}.`);
      setEditing(null);
      await reload();
    } catch (err) {
      setNotice(`Save failed: ${err.message}`);
    }
  };

  return (
    <div className="container">
      <h1>BOM ({items.length})</h1>
      {notice && <div className="card" style={{ margin: '0.5rem 0' }}>{notice}</div>}
      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Item</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Price</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const locked = Array.isArray(item.lockedFields) ? item.lockedFields : [];
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem' }}>
                    {item.item}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.spec}{locked.length > 0 && ` · 🔒 ${locked.join(', ')}`}
                    </div>
                    <div>
                      {EDITABLE.map(({ field, label, type }) => (
                        <button
                          key={field}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginRight: '0.25rem' }}
                          onClick={() => openEditor(item, field, type)}
                        >
                          Edit {label}{locked.includes(field) ? ' 🔒' : ''}
                        </button>
                      ))}
                    </div>
                  </td>
                  {/* Value cells are tap targets too — same editor as the buttons above. */}
                  <td
                    title="Tap to edit purchase quantity"
                    onClick={() => openEditor(item, 'purchaseQty', 'number')}
                    style={{ textAlign: 'right', padding: '0.75rem 0.5rem', cursor: 'pointer' }}
                  >
                    {formatNumber(item.purchaseQty)}{locked.includes('purchaseQty') ? ' 🔒' : ''}
                  </td>
                  <td
                    title="Tap to edit unit cost"
                    onClick={() => openEditor(item, 'unitCost', 'number')}
                    style={{ textAlign: 'right', padding: '0.75rem 0.5rem', cursor: 'pointer' }}
                  >
                    {formatCurrency(item.unitCost)}{locked.includes('unitCost') ? ' 🔒' : ''}
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>{formatCurrency(item.estTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Edit {editing.field} (will lock the field)</h3>
          <input
            autoFocus
            type={editing.type}
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
          />
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={saveEdit}>Save + lock</button>
            <button onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
