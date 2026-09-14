/**
 * BomScreen.jsx — Agent 4: BOM as a one-handed row list, ordered by displayOrder.
 * Supervisor edits go through mergeEngine.supervisorEdit (locks + supervisor log).
 * Value cells are real controls: role="button", keyboard-operable, 48px targets.
 * Reorder (drag or up/down buttons) persists via bomRepo.reorderBomItems immediately.
 * "Export BOM" (top, this screen) is distinct from PO's "Generate PO" (PO screen).
 */
import React, { useEffect, useState } from 'react';
import { listBomItems, reorderBomItems } from '../data/bomRepo.js';
import * as bomRepo from '../data/bomRepo.js';
import { getProject } from '../data/projectRepo.js';
import { listChangeLog } from '../data/changeLogRepo.js';
import { appendChangeLog } from '../data/changeLogRepo.js';
import { supervisorEdit } from '../logic/mergeEngine.js';
import {
  buildBomExportLines,
  buildBomExportData,
  renderBomExportPdf,
} from '../logic/bomExportDocument.js';
import { formatCurrency, formatNumber, formatShortDate } from '../utils/helpers.js';

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

const byDisplayOrder = (rows) =>
  [...rows].sort((a, b) => {
    const x = typeof a.displayOrder === 'number' ? a.displayOrder : Number.MAX_SAFE_INTEGER;
    const y = typeof b.displayOrder === 'number' ? b.displayOrder : Number.MAX_SAFE_INTEGER;
    return x - y;
  });

export default function BomScreen({ projectId }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // { id, field, value, type }
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const reload = async () => setItems(await listBomItems(projectId));
  useEffect(() => { reload(); }, [projectId]);

  const ordered = byDisplayOrder(items);

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

  const persistOrder = async (orderedIds, movedName, toPosition) => {
    await reorderBomItems(projectId, orderedIds);
    setNotice(`Moved "${movedName}" to position ${toPosition}. Order saved.`);
    await reload();
  };

  const move = async (id, dir) => {
    const ids = ordered.map((r) => r.id);
    const from = ids.indexOf(id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const row = ordered.find((r) => r.id === id);
    await persistOrder(next, row ? row.item : id, to + 1);
  };

  const onDropOn = async (targetId) => {
    if (!dragId || dragId === targetId) return;
    const ids = ordered.map((r) => r.id).filter((id) => id !== dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to < 0 ? ids.length : to, 0, dragId);
    const row = ordered.find((r) => r.id === dragId);
    setDragId(null);
    await persistOrder(ids, row ? row.item : dragId, (to < 0 ? ids.length : to) + 1);
  };

  const exportBom = async () => {
    if (exporting) return;
    setExporting(true);
    setNotice(null);
    try {
      const [project, rows, log] = await Promise.all([
        getProject(projectId),
        listBomItems(projectId),
        listChangeLog(projectId),
      ]);
      const lines = buildBomExportLines(rows);
      const importNotes = log.filter((c) => c.field === 'import_note');
      const lastImport = importNotes.length > 0 ? importNotes[importNotes.length - 1] : null;
      const data = buildBomExportData({
        project,
        quotationDate: lastImport ? formatShortDate(lastImport.timestamp) : '—',
        source: 'Agent 6/7 Reconciliation Pipeline',
        generatedAt: new Date().toISOString(),
        lines,
      });
      const bytes = renderBomExportPdf(data);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const name = `BOM_${(project ? project.name : 'export').replace(/[^A-Za-z0-9]+/g, '_')}.pdf`;
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setNotice(`BOM export generated (${data.itemCount} lines). Not sent.`);
    } catch (err) {
      setNotice(`BOM export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container">
      <h1>BOM ({items.length})</h1>
      <button onClick={exportBom} disabled={exporting} style={{ margin: '0.5rem 0' }}>
        {exporting ? 'Exporting…' : 'Export BOM'}
      </button>
      {notice && <div className="card" role="status" style={{ margin: '0.5rem 0' }}>{notice}</div>}
      {items.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No items yet.</p>}

      <div className="rowlist">
        {ordered.map((item, i) => {
          const locked = Array.isArray(item.lockedFields) ? item.lockedFields : [];
          return (
            <div
              key={item.id}
              className="row"
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropOn(item.id)}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="badge" aria-label={`Position ${i + 1}`}>{i + 1}</span>
                <strong>{item.item}</strong>{' '}
                {locked.length > 0 && (
                  <span className="badge">🔒 {locked.join(', ')}</span>
                )}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
                  <button
                    className="secondary"
                    style={{ minWidth: '48px', padding: '0.25rem 0.5rem' }}
                    aria-label={`Move ${item.item} up`}
                    onClick={() => move(item.id, -1)}
                  >
                    ▲
                  </button>
                  <button
                    className="secondary"
                    style={{ minWidth: '48px', padding: '0.25rem 0.5rem' }}
                    aria-label={`Move ${item.item} down`}
                    onClick={() => move(item.id, 1)}
                  >
                    ▼
                  </button>
                </span>
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
