/**
 * App.jsx — Logistics Helper v3 (multi-agent pipeline shell).
 *
 * Entry screen (outside any project): Projects list.
 * Inside an open project, bottom tab bar: Dashboard | BOM | Confirm | Suppliers | PO.
 * Text labels (no emoji); Confirm carries a live open-count badge.
 *
 * Hard rule: requesting the PO tab while ANY unresolved ShortageConfirmItem
 * exists redirects to Confirm (resolveTabRequest — screens/poGate.js).
 * No business logic here — only navigation + wiring.
 */
import React, { useEffect, useState } from 'react';
import ProjectsScreen from './screens/ProjectsScreen.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';
import BomScreen from './screens/BomScreen.jsx';
import ConfirmScreen from './screens/ConfirmScreen.jsx';
import SuppliersScreen from './screens/SuppliersScreen.jsx';
import PoScreen from './screens/PoScreen.jsx';
import { resolveTabRequest } from './screens/poGate.js';
import { countUnresolved } from './data/shortageRepo.js';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'bom', label: 'BOM' },
  { id: 'confirm', label: 'Confirm' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'po', label: 'PO' },
];

export default function App() {
  const [projectId, setProjectId] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [gateNotice, setGateNotice] = useState(null);
  const [openCount, setOpenCount] = useState(0);

  // Live badge count: re-read on project/tab change and after Confirm actions.
  const refreshGate = async (id) => {
    if (!id) return;
    setOpenCount(await countUnresolved(id));
  };

  useEffect(() => {
    // NOTE: never clear gateNotice here — a tab change is part of the redirect
    // itself, and clearing would erase the blocked banner before it is seen.
    // requestTab clears it at the start of the next navigation instead.
    refreshGate(projectId);
  }, [projectId, tab]);

  const requestTab = async (wanted) => {
    setGateNotice(null);
    if (wanted === 'po' && projectId) {
      const open = await countUnresolved(projectId);
      const actual = resolveTabRequest(wanted, open);
      if (actual !== wanted) {
        setGateNotice(`PO blocked — ${open} open. Resolve them on Confirm.`);
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
          <div className="banner blocked" role="alert">
            {gateNotice}
          </div>
        </div>
      )}

      {tab === 'dashboard' && <DashboardScreen projectId={projectId} onGoConfirm={() => setTab('confirm')} />}
      {tab === 'bom' && <BomScreen projectId={projectId} onGoSuppliers={() => setTab('suppliers')} />}
      {tab === 'confirm' && <ConfirmScreen projectId={projectId} onChanged={() => refreshGate(projectId)} />}
      {tab === 'suppliers' && <SuppliersScreen projectId={projectId} />}
      {tab === 'po' && <PoScreen projectId={projectId} onGoConfirm={() => setTab('confirm')} />}

      <nav className="tab-bar" aria-label="Project sections">
        <button onClick={() => { setProjectId(null); setTab('dashboard'); }}>
          Projects
        </button>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => requestTab(t.id)}
          >
            {t.label}
            {t.id === 'confirm' && openCount > 0 && (
              <span className="tab-badge" aria-label={`${openCount} open confirmations`}>{openCount}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
