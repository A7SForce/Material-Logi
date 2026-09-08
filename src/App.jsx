/**
 * App.jsx — Logistics Helper v3 Main Application
 * 
 * Implements the end-to-end flow from Section 8:
 * Import DSG B Excel → Review BOM → Quick-Kits → Coverage Validator → 
 * Supplier Assignment → Quotes Tracker → Generate PO → Send via WhatsApp
 */
import React, { useState } from 'react';
import { parseDSGB } from './utils/excelParser/dsgB.js';
import { findMatchingKit, calculateKitQty } from './data/structuralKits.js';
import { validateCoverage } from './utils/coverageRules.js';
import { formatCurrency, formatNumber } from './utils/helpers.js';

// ── Components ──────────────────────────────────────────────────────────────

const FileUploader = ({ onFileParsed, onError }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    
    try {
      const result = await parseDSGB(file);
      
      if (result.success) {
        onFileParsed(result);
      } else {
        onError(result.error || 'Failed to parse file');
      }
    } catch (err) {
      onError(err.message || 'Unknown error parsing file');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div
      className={`card ${isDragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      style={{ textAlign: 'center', padding: '2rem' }}
    >
      <h2>Import DSG B Excel</h2>
      <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>
        Upload a DSG B-formatted Excel file from System A
      </p>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => handleFile(e.target.files[0])}
        style={{ marginTop: '1rem' }}
      />
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        Only DSG B Excel files accepted. Other formats will be rejected.
      </p>
    </div>
  );
};

const BOMTable = ({ items, viewMode = 'purchase' }) => {
  // Section 7: Two views toggled with one tap - Purchase vs Audit
  const isAudit = viewMode === 'audit';
  
  return (
    <div className="card">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Item</th>
            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Qty</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Unit</th>
            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Price</th>
            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
            {isAudit && <th style={{ textAlign: 'left', padding: '0.5rem' }}>Source</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.5rem' }}>{item.item}</td>
              <td style={{ textAlign: 'right', padding: '0.5rem' }}>{formatNumber(item.quantity)}</td>
              <td style={{ padding: '0.5rem' }}>{item.unit}</td>
              <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                {formatCurrency(item.unitPrice)}
              </td>
              <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                {formatCurrency(item.total)}
              </td>
              {isAudit && (
                <td style={{ padding: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {item.source}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const QuickKitPanel = ({ bomItems, onAddItems }) => {
  const [suggestions, setSuggestions] = useState([]);

  React.useEffect(() => {
    const newSuggestions = [];
    
    for (const item of bomItems) {
      const kit = findMatchingKit(item);
      if (kit) {
        const missing = [];
        
        for (const req of kit.required) {
          const requiredQty = calculateKitQty(req.qtyFormula, item.quantity);
          const existing = bomItems.find(i => 
            i.item.toLowerCase().includes(req.sku.split(' ')[0].toLowerCase())
          );
          
          if (!existing || existing.quantity < requiredQty) {
            missing.push({
              ...req,
              driverItem: item.item,
              requiredQty,
              currentQty: existing?.quantity || 0,
            });
          }
        }
        
        if (missing.length > 0) {
          newSuggestions.push({ kit, missing });
        }
      }
    }
    
    setSuggestions(newSuggestions);
  }, [bomItems]);

  if (suggestions.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3 style={{ color: 'var(--primary)' }}>Quick-Kit Suggestions</h3>
      {suggestions.map(({ kit, missing }, idx) => (
        <div key={idx} style={{ margin: '1rem 0', padding: '0.75rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
          <strong>{kit.name}</strong> (triggered by: {missing[0].driverItem})
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            {missing.map((m, i) => (
              <li key={i}>
                {m.sku}: Need {m.requiredQty}, have {m.currentQty}
                <button
                  onClick={() => onAddItems(m)}
                  style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

const CoverageValidator = ({ bomItems, projectArea }) => {
  const errors = validateCoverage(bomItems, projectArea);
  
  if (errors.length === 0) {
    return (
      <div className="card" style={{ background: '#f0fdf4', borderColor: 'var(--success)' }}>
        <span className="text-success">✓ Coverage validation passed</span>
      </div>
    );
  }

  return (
    <div className="card" style={{ background: '#fef2f2', borderColor: 'var(--error)' }}>
      <h3 style={{ color: 'var(--error)' }}>⚠ Coverage Validation Failed</h3>
      <p style={{ marginBottom: '0.5rem' }}>Cannot generate PO until resolved:</p>
      <ul style={{ paddingLeft: '1.5rem' }}>
        {errors.map((err, idx) => (
          <li key={idx} style={{ marginBottom: '0.5rem' }}>{err.message}</li>
        ))}
      </ul>
    </div>
  );
};

// ── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState('import');
  const [bomItems, setBomItems] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('purchase'); // 'purchase' | 'audit'
  const [projectArea, setProjectArea] = useState(0);

  const handleFileParsed = (result) => {
    setBomItems(result.materials);
    setMetadata(result.metadata);
    setError(null);
    setActiveTab('review');
  };

  const handleError = (errMsg) => {
    setError(errMsg);
    setBomItems([]);
    setMetadata(null);
  };

  const handleAddKitItem = (kitItem) => {
    const newItem = {
      id: `kit-${Date.now()}`,
      item: kitItem.sku,
      category: 'Supporting',
      quantity: kitItem.requiredQty,
      unit: 'pcs',
      unitPrice: 0,
      price: 0,
      total: 0,
      source: 'quick-kit',
      confidence: 1,
    };
    setBomItems([...bomItems, newItem]);
  };

  const canGeneratePO = () => {
    const coverageErrors = validateCoverage(bomItems, projectArea);
    return coverageErrors.length === 0 && bomItems.length > 0;
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '1rem' }}>
        <h1>Logistics Helper v3</h1>
        <p style={{ color: 'var(--text-muted)' }}>Deterministic operations tool for construction logistics</p>
      </header>

      {error && (
        <div className="card" style={{ background: '#fef2f2', marginBottom: '1rem' }}>
          <span className="text-error">Error: {error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: '1rem' }}>Dismiss</button>
        </div>
      )}

      {activeTab === 'import' && (
        <FileUploader onFileParsed={handleFileParsed} onError={handleError} />
      )}

      {activeTab === 'review' && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              onClick={() => setViewMode('purchase')}
              style={{ flex: 1, background: viewMode === 'purchase' ? 'var(--primary)' : 'var(--surface)' }}
            >
              Purchase View
            </button>
            <button
              onClick={() => setViewMode('audit')}
              style={{ flex: 1, background: viewMode === 'audit' ? 'var(--primary)' : 'var(--surface)' }}
            >
              Audit View
            </button>
          </div>

          {metadata && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <strong>Project:</strong> {metadata.projectName}<br />
              <strong>Items:</strong> {metadata.totalItems}<br />
              <strong>Total:</strong> {formatCurrency(metadata.totalPrice)}
            </div>
          )}

          <QuickKitPanel bomItems={bomItems} onAddItems={handleAddKitItem} />
          
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Project Area (m²): 
              <input
                type="number"
                value={projectArea}
                onChange={(e) => setProjectArea(Number(e.target.value))}
                style={{ marginLeft: '0.5rem', width: '100px' }}
              />
            </label>
          </div>

          <CoverageValidator bomItems={bomItems} projectArea={projectArea} />
          
          <BOMTable items={bomItems} viewMode={viewMode} />
          
          <button
            disabled={!canGeneratePO()}
            style={{
              width: '100%',
              marginTop: '1rem',
              background: canGeneratePO() ? 'var(--success)' : 'var(--text-muted)',
            }}
          >
            Generate PO
          </button>
        </>
      )}

      {/* Bottom Tab Bar (Section 7: Mobile-first navigation) */}
      <nav className="tab-bar">
        <button
          className={activeTab === 'import' ? 'active' : ''}
          onClick={() => setActiveTab('import')}
        >
          📥 Import
        </button>
        <button
          className={activeTab === 'review' ? 'active' : ''}
          onClick={() => setActiveTab('review')}
          disabled={bomItems.length === 0}
        >
          📋 Review
        </button>
        <button disabled title="Coming soon">
          🏪 Suppliers
        </button>
        <button disabled title="Coming soon">
          📄 Quotes/PO
        </button>
      </nav>
    </div>
  );
}
