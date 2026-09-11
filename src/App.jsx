/**
 * App.jsx — Logistics Helper v3 (multi-agent pipeline shell).
 *
 * Entry screen (outside any project): Projects list.
 * Inside an open project, bottom tab bar: Dashboard | BOM | Confirm | Suppliers | PO.
 *
 * Hard rule: requesting the PO tab while ANY unresolved ShortageConfirmItem
 * exists redirects to Confirm (resolveTabRequest — screens/poGate.js).
 * No business logic here — only navigation + wiring.
 */
import React, { useState } from 'react';
import ProjectsScreen from './screens/ProjectsScreen.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';
import BomScreen from './screens/BomScreen.jsx';
import ConfirmScreen from './screens/ConfirmScreen.jsx';
import SuppliersScreen from './screens/SuppliersScreen.jsx';
import PoScreen from './screens/PoScreen.jsx';
import { resolveTabRequest } from './screens/poGate.js';
import { countUnresolved } from './data/shortageRepo.js';

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'bom', label: '📋 BOM' },
  { id: 'confirm', label: '✅ Confirm' },
  { id: 'suppliers', label: '🏪 Suppliers' },
  { id: 'po', label: '📄 PO' },
];

export default function App() {
  const [projectId, setProjectId] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [gateNotice, setGateNotice] = useState(null);

  const requestTab = async (wanted) => {
    setGateNotice(null);
    if (wanted === 'po' && projectId) {
      const open = await countUnresolved(projectId);
      const actual = resolveTabRequest(wanted, open);
      if (actual !== wanted) {
        setGateNotice(`PO blocked — ${open} open confirmation(s). Resolve them on the Confirm tab first.`);
      }
      setTab(actual);
      return;
    }
    setTab(wanted);
  };

  if (!projectId) {
    return <ProjectsScreen onOpenProject={(id) => { setProjectId(id); setTab('dashboard'); }} />;
  }

  return (
    <div>
      {gateNotice && (
        <div className="container" style={{ paddingBottom: 0 }}>
          <div className="card" style={{ background: '#fef2f2', marginBottom: '0.5rem' }}>
            {gateNotice}
          </div>
        </div>
      )}

      {tab === 'dashboard' && <DashboardScreen projectId={projectId} />}
      {tab === 'bom' && <BomScreen projectId={projectId} />}
      {tab === 'confirm' && <ConfirmScreen projectId={projectId} onChanged={() => {}} />}
      {tab === 'suppliers' && <SuppliersScreen projectId={projectId} />}
      {tab === 'po' && <PoScreen projectId={projectId} onGoConfirm={() => setTab('confirm')} />}

      <nav className="tab-bar">
        <button onClick={() => { setProjectId(null); setTab('dashboard'); }}>
          📁 Projects
        </button>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => requestTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
