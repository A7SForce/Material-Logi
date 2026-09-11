/**
 * PoScreen.jsx — Agent 4: PO generation view.
 * Hard rule enforced: blocked while ANY unresolved ShortageConfirmItem exists.
 * The gate decision itself is getPoGate() (screens/poGate.js) — pure + tested,
 * unchanged by the PDF feature. PDF content comes from logic/poDocument.js
 * (same BomItem[], TBD for missing prices). The WhatsApp link derives strictly
 * from pdfUrl state, so it can only appear after a PDF exists.
 */
import React, { useEffect, useState } from 'react';
import { getProject } from '../data/projectRepo.js';
import { listBomItems } from '../data/bomRepo.js';
import { countUnresolved } from '../data/shortageRepo.js';
import { getPoGate } from './poGate.js';
import {
  buildPoLines,
  buildPoTotal,
  buildPoSummaryText,
  buildWhatsAppLink,
  renderPoPdf,
  formatMoney,
} from '../logic/poDocument.js';
import { formatNumber } from '../utils/helpers.js';

export default function PoScreen({ projectId, onGoConfirm }) {
  const [projectName, setProjectName] = useState('');
  const [lines, setLines] = useState([]);
  const [total, setTotal] = useState(0);
  const [gate, setGate] = useState({ allowed: false, redirect: 'confirm' });
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    (async () => {
      const [project, rows, open] = await Promise.all([
        getProject(projectId),
        listBomItems(projectId),
        countUnresolved(projectId),
      ]);
      setProjectName(project ? project.name : 'UNKNOWN PROJECT');
      const built = buildPoLines(rows);
      setLines(built);
      setTotal(buildPoTotal(built));
      setGate(getPoGate(open));
    })();
  }, [projectId]);

  // Derives strictly from pdfUrl: no PDF -> no WhatsApp link, by construction.
  const waLink = pdfUrl
    ? buildWhatsAppLink(buildPoSummaryText({ projectName, lines, total }))
    : null;

  const generatePdf = () => {
    setGenError(null);
    try {
      const generatedAt = new Date().toISOString();
      const bytes = renderPoPdf({ projectName, generatedAt, lines, total });
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const name = `PO_${projectName.replace(/[^A-Za-z0-9]+/g, '_')}.pdf`;
      setPdfUrl(url);
      setPdfName(name);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
    } catch (err) {
      setGenError(`PDF generation failed: ${err.message}`);
    }
  };

  if (!gate.allowed) {
    return (
      <div className="container">
        <h1>Purchase Order</h1>
        <div className="card" style={{ background: '#fef2f2', marginTop: '1rem' }}>
          <h3 style={{ color: 'var(--error)' }}>⛔ PO blocked — open confirmations</h3>
          <p>Resolve every item on the Confirm tab before generating a PO.</p>
          <button onClick={onGoConfirm} style={{ marginTop: '0.5rem' }}>Go to Confirm</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Purchase Order</h1>
      <div className="card" style={{ margin: '1rem 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Item</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.5rem' }}>{l.item}</td>
                <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                  {l.qty === null ? 'TBD' : `${formatNumber(l.qty)} ${l.unit || ''}`}
                </td>
                <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                  {l.lineTotal === null ? 'TBD' : formatMoney(l.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
          <strong>Total (priced lines): {formatMoney(total)}</strong>
        </div>
      </div>

      {genError && <div className="card" style={{ background: '#fef2f2' }}>{genError}</div>}

      <button onClick={generatePdf} style={{ width: '100%' }}>
        Generate PO
      </button>

      {waLink && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{pdfName} ready.</div>
          <a href={waLink} target="_blank" rel="noreferrer">
            <button style={{ width: '100%', marginTop: '0.5rem' }}>Send via WhatsApp</button>
          </a>
        </div>
      )}
    </div>
  );
}
