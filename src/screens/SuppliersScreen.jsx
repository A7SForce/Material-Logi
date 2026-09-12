/**
 * SuppliersScreen.jsx — Agent 4: project supplier directory + global browser.
 * Wiring only: linking runs linkSupplierEntry (logic/supplierLinking.js), the
 * same dedupe-by-name rule the import path uses — tapping never duplicates a
 * GlobalSupplier record, it only adds a ProjectSupplierLink.
 */
import React, { useEffect, useState } from 'react';
import { listProjectSuppliers, listSuppliers, createSupplier, linkSupplierToProject, getSupplier } from '../data/supplierRepo.js';
import { linkSupplierEntry } from '../logic/supplierLinking.js';

const linkDeps = { listSuppliers, createSupplier, linkSupplierToProject };

const matchesQuery = (s, q) => {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  // Region filtering works through the address text (e.g. "Kuching", "Betong").
  return [s.businessName, s.specialty, s.address, s.contact]
    .some((f) => String(f || '').toLowerCase().includes(query));
};

export default function SuppliersScreen({ projectId }) {
  const [rows, setRows] = useState([]);
  const [browsing, setBrowsing] = useState(false);
  const [directory, setDirectory] = useState([]);
  const [linkedIds, setLinkedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [notice, setNotice] = useState(null);

  const reloadLinks = async () => {
    const links = await listProjectSuppliers(projectId);
    const joined = await Promise.all(
      links.map(async (l) => ({
        link: l,
        supplier: await getSupplier(l.globalSupplierId),
      }))
    );
    setRows(joined.filter((r) => r.supplier));
    setLinkedIds(new Set(links.map((l) => l.globalSupplierId)));
  };

  useEffect(() => { reloadLinks(); }, [projectId]);

  const openBrowser = async () => {
    setNotice(null);
    setDirectory(await listSuppliers());
    await reloadLinks();
    setBrowsing(true);
  };

  const linkRow = async (supplier) => {
    try {
      await linkSupplierEntry(projectId, supplier, linkDeps);
      await reloadLinks();
      setNotice(`Linked "${supplier.businessName}" to this project.`);
    } catch (err) {
      setNotice(`Link failed: ${err.message}`);
    }
  };

  // Tag chips are data-driven: only tags actually present in the directory appear.
  const allTags = [...new Set(directory.flatMap((s) => (Array.isArray(s.tags) ? s.tags : [])))];
  const visible = directory.filter(
    (s) => matchesQuery(s, query) && (activeTag === null || (s.tags || []).includes(activeTag))
  );

  return (
    <div className="container">
      <h1>Suppliers ({rows.length})</h1>
      {notice && <div className="card" style={{ margin: '0.5rem 0' }}>{notice}</div>}

      {!browsing && (
        <button onClick={openBrowser} style={{ marginBottom: '0.5rem' }}>
          Browse All Suppliers
        </button>
      )}

      {browsing && (
        <div className="card anim-panel" style={{ marginBottom: '0.5rem' }}>
          <h3>Global Supplier Directory ({visible.length}/{directory.length})</h3>
          <label className="small" htmlFor="supplier-search">Search suppliers</label>
          <input
            id="supplier-search"
            type="search"
            placeholder="Search name, specialty, address (e.g. Kuching)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', marginTop: '0.25rem' }}
          />
          {allTags.length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              <button
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                onClick={() => setActiveTag(null)}
              >
                All{activeTag === null ? ' ✓' : ''}
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  onClick={() => setActiveTag(t === activeTag ? null : t)}
                >
                  {t}{t === activeTag ? ' ✓' : ''}
                </button>
              ))}
            </div>
          )}
          <div style={{ marginTop: '0.5rem' }}>
            {visible.map((s) => {
              const linked = linkedIds.has(s.id);
              return (
                <div key={s.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <strong>{s.businessName}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {[s.specialty, s.address].filter(Boolean).join(' · ')}
                  </div>
                  <button
                    disabled={linked}
                    onClick={() => linkRow(s)}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginTop: '0.25rem' }}
                  >
                    {linked ? 'Linked ✓' : 'Link to this project'}
                  </button>
                </div>
              );
            })}
            {visible.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>No suppliers match.</p>
            )}
          </div>
          <button onClick={() => setBrowsing(false)} style={{ marginTop: '0.5rem' }}>
            Back to project suppliers
          </button>
        </div>
      )}

      {rows.map(({ link, supplier }) => (
        <div key={`${link.projectId}-${link.globalSupplierId}`} className="card" style={{ marginBottom: '0.5rem' }}>
          <strong>{supplier.businessName}</strong>
          <div style={{ fontSize: '0.875rem' }}>
            {supplier.contact && <div>Contact: {supplier.contact}</div>}
            {supplier.address && <div>{supplier.address}</div>}
            {supplier.specialty && <div>Specialty: {supplier.specialty}</div>}
            {supplier.logisticsNote && <div>Logistics: {supplier.logisticsNote}</div>}
            {supplier.sourceUrl && (
              <div><a className="btn" href={supplier.sourceUrl} target="_blank" rel="noreferrer">Source</a></div>
            )}
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }}>No suppliers linked to this project.</p>
      )}
    </div>
  );
}
