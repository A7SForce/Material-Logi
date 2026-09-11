/**
 * touchTargets.test.js — Agent 5 (Task G1).
 * 48px minimum on every interactive element, verified two ways:
 *   1. Stylesheet contract: src/index.css declares >= 48px min-height AND
 *      min-width for buttons, inputs, and tab-bar buttons (catches regressions
 *      like a min-height:auto override).
 *   2. Rendered output: every button/input/select/textarea/link-button in each
 *      screen's real render gets the >= 48px computed minimums (stylesheet
 *      injected, seeded data so list rows and toggle targets render).
 *
 * Honest limit: jsdom has no layout engine, so this asserts the applied CSS
 * minimums on real elements — the automatable proxy. Real tap feel (reach,
 * accuracy, in-hand feel) stays in the G4 manual checklist.
 */
/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import { createBomItem } from '../src/data/bomRepo.js';
import { createShortageItem } from '../src/data/shortageRepo.js';
import { createSupplier, linkSupplierToProject } from '../src/data/supplierRepo.js';
import App from '../src/App.jsx';
import ProjectsScreen from '../src/screens/ProjectsScreen.jsx';
import DashboardScreen from '../src/screens/DashboardScreen.jsx';
import BomScreen from '../src/screens/BomScreen.jsx';
import ConfirmScreen from '../src/screens/ConfirmScreen.jsx';
import SuppliersScreen from '../src/screens/SuppliersScreen.jsx';
import PoScreen from '../src/screens/PoScreen.jsx';

afterEach(() => cleanup());

// Stylesheet under test, read from disk (vitest empties CSS ?raw imports, so
// fs is the honest source) and injected so getComputedStyle resolves author rules.
const testDir = path.dirname(fileURLToPath(import.meta.url));
const cssText = fs.readFileSync(path.join(testDir, '..', 'src', 'index.css'), 'utf8');
const styleTag = document.createElement('style');
styleTag.textContent = cssText;
document.head.appendChild(styleTag);

const px = (v) => Number(String(v || '').replace('px', ''));

const assertTapTargets = (container) => {
  const els = container.querySelectorAll('button, input, select, textarea, a.btn');
  expect(els.length).toBeGreaterThan(0);
  for (const el of els) {
    const cs = getComputedStyle(el);
    const label = `<${el.tagName.toLowerCase()}> "${(el.textContent || el.type || '').slice(0, 24)}"`;
    expect(px(cs.minHeight), `${label} min-height`).toBeGreaterThanOrEqual(48);
    expect(px(cs.minWidth), `${label} min-width`).toBeGreaterThanOrEqual(48);
  }
  return els.length;
};

const seedStandardProject = async () => {
  const project = await createProject({ name: 'TOUCH PROBE' });
  await createBomItem({ projectId: project.id, item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 12, unitCost: 28 });
  await createShortageItem({ projectId: project.id, severity: 'MEDIUM', issue: 'Probe question', kind: 'agent_question', resolved: false });
  const linked = await createSupplier({ businessName: 'Linked Store', address: 'Betong' });
  const unlinked = await createSupplier({ businessName: 'Other Store', address: 'Kuching' });
  await linkSupplierToProject({ projectId: project.id, globalSupplierId: linked.id });
  return { project, unlinked };
};

beforeEach(async () => {
  await clearAllTables();
});

describe('G1: stylesheet declares 48px minimums', () => {
  it('button/input/tab-bar rules carry >= 48px min-height and min-width', () => {
    for (const min of ['min-height: 48px', 'min-width: 48px']) {
      expect(cssText.includes(min)).toBe(true);
    }
    expect(cssText).not.toMatch(/\.tab-bar button\s*\{[^}]*min-height:\s*auto/);
  });
});

describe('G1: every rendered interactive element meets 48px', () => {
  it('Projects (file input + Open) / Dashboard (vacuous) / BOM (edit buttons)', async () => {
    const { project } = await seedStandardProject();

    const p = render(<ProjectsScreen onOpenProject={() => {}} />);
    await p.findByText('Open'); // project list loads async from Dexie
    expect(p.container.querySelectorAll('button, input, select, textarea, a.btn').length).toBeGreaterThanOrEqual(2);
    assertTapTargets(p.container);
    p.unmount();

    const d = render(<DashboardScreen projectId={project.id} />);
    await d.findByText('TOUCH PROBE');
    // Dashboard currently has no tap targets — vacuously compliant, asserted as zero.
    expect(d.container.querySelectorAll('button, input, select, textarea, a.btn').length).toBe(0);
    d.unmount();

    const b = render(<BomScreen projectId={project.id} />);
    await b.findByText('Gypsum Board 9mm');
    expect(b.container.querySelectorAll('button').length).toBeGreaterThanOrEqual(2);
    assertTapTargets(b.container);
    b.unmount();
  });

  it('Confirm (Approve/Dismiss) / Suppliers (browse + link + source) / PO blocked', async () => {
    const { project } = await seedStandardProject();

    const c = render(<ConfirmScreen projectId={project.id} />);
    await c.findByText('Probe question');
    assertTapTargets(c.container);
    c.unmount();

    const s = render(<SuppliersScreen projectId={project.id} />);
    await s.findByText('Linked Store');
    fireEvent.click(s.getByText('Browse All Suppliers'));
    await s.findByPlaceholderText(/Search name/);
    assertTapTargets(s.container);
    s.unmount();

    const po = render(<PoScreen projectId={project.id} onGoConfirm={() => {}} />);
    await po.findByText(/PO blocked/);
    assertTapTargets(po.container);
    po.unmount();
  });

  it('App tab bar: all six tab buttons meet 48px', async () => {
    await seedStandardProject();
    const app = render(<App />);
    fireEvent.click(await app.findByText('Open')); // enter the project context
    for (const label of ['📁 Projects', '📊 Dashboard', '📋 BOM', '✅ Confirm', '🏪 Suppliers', '📄 PO']) {
      await app.findByText(label, { selector: 'button' });
    }
    const tabs = app.container.querySelectorAll('.tab-bar button');
    expect(tabs.length).toBe(6);
    for (const t of tabs) {
      expect(px(getComputedStyle(t).minHeight)).toBeGreaterThanOrEqual(48);
      expect(px(getComputedStyle(t).minWidth)).toBeGreaterThanOrEqual(48);
    }
    app.unmount();
  });
});
