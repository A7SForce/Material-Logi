/**
 * redesignUi.test.jsx — Agent 5 (redesign slices 2–5).
 * Changed interaction contracts, one file:
 *   - text tabs + live Confirm count badge (App)
 *   - Confirm grouped by kind with per-kind action labels
 *   - Dashboard sentences (no storage field names) + Blocked/Ready badge
 *   - two-tap project delete with consequence copy
 *   - single PO-blocked banner copy on the redirect
 */
/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import { createBomItem } from '../src/data/bomRepo.js';
import { createShortageItem } from '../src/data/shortageRepo.js';
import { appendChangeLog } from '../src/data/changeLogRepo.js';
import App from '../src/App.jsx';
import BomScreen from '../src/screens/BomScreen.jsx';
import ConfirmScreen from '../src/screens/ConfirmScreen.jsx';
import DashboardScreen from '../src/screens/DashboardScreen.jsx';
import ProjectsScreen from '../src/screens/ProjectsScreen.jsx';

afterEach(() => cleanup());

beforeEach(async () => {
  await clearAllTables();
});

const seedThreeKinds = async (projectId) => {
  await createShortageItem({ projectId, severity: 'LOW', issue: 'A question', kind: 'agent_question', resolved: false });
  await createShortageItem({ projectId, severity: 'MEDIUM', issue: 'A new item', kind: 'new_item_pending', resolved: false, refItem: 'X', refSpec: 'Y' });
  await createShortageItem({ projectId, severity: 'MEDIUM', issue: 'A removed item', kind: 'removed_item_pending', resolved: false, refItem: 'Z', refSpec: 'W' });
};

describe('redesign contracts', () => {
  it('tabs are text with a live Confirm badge; PO redirect shows the single banner', async () => {
    const project = await createProject({ name: 'BADGE PROBE' });
    await createShortageItem({ projectId: project.id, severity: 'LOW', issue: 'Q1', kind: 'agent_question', resolved: false });
    await createShortageItem({ projectId: project.id, severity: 'LOW', issue: 'Q2', kind: 'agent_question', resolved: false });

    const app = render(<App />);
    fireEvent.click(await app.findByText('Open'));
    const badge = await app.findByText('2', { selector: 'span' });
    expect(badge.className).toMatch(/tab-badge/);
    expect(badge.getAttribute('aria-label')).toBe('2 open confirmations');

    fireEvent.click(app.getByText('PO', { selector: 'button' }));
    await app.findByText('PO blocked — 2 open. Resolve them on Confirm.');
    // Redirected, not rendered: Confirm heading present, no PO content.
    await app.findByText('Confirm (2 open)');
    // Banner survives effects/ticks — it is context for the redirect, not a flash.
    await new Promise((r) => setTimeout(r, 300));
    app.getByText('PO blocked — 2 open. Resolve them on Confirm.');
    app.unmount();
  });

  it('Confirm groups by kind with consequence copy and per-kind labels', async () => {
    const project = await createProject({ name: 'GROUP PROBE' });
    await seedThreeKinds(project.id);
    const ui = render(<ConfirmScreen projectId={project.id} />);
    await ui.findByText('Questions from the agent (1)');
    ui.getByText('New items from the latest import (1)');
    ui.getByText('Missing from the latest import (1)');
    ui.getByText('Approve adds the item to the BOM. Dismiss leaves the BOM unchanged.');
    ui.getByText('Mark resolved');
    ui.getByText('Approve — add to BOM');
    ui.getByText('Approve — remove from BOM');
    ui.unmount();
  });

  it('Dashboard speaks sentences with a Blocked badge, never field names', async () => {
    const project = await createProject({ name: 'DIARY PROBE' });
    await createShortageItem({ projectId: project.id, severity: 'LOW', issue: 'Q', kind: 'agent_question', resolved: false });
    await appendChangeLog({ projectId: project.id, actor: 'agent', field: 'import_note', oldValue: null, newValue: 'Full regeneration under A7 pipeline' });
    const ui = render(<DashboardScreen projectId={project.id} onGoConfirm={() => {}} />);
    await ui.findByText('DIARY PROBE');
    ui.getByText('Blocked — 1 open.');
    const diary = ui.getByText(/Full regeneration under A7 pipeline/);
    expect(diary.textContent).toMatch(/Agent note/);
    expect(ui.container.textContent).not.toMatch(/import_note/);
    ui.unmount();
  });

  it('delete arms with consequence copy, second tap removes the card', async () => {    const project = await createProject({ name: 'DELETE PROBE' });
    const ui = render(<ProjectsScreen onOpenProject={() => {}} />);
    await ui.findByText('DELETE PROBE');
    fireEvent.click(ui.getByText('Delete'));
    await ui.findByText('Tap again to confirm delete');
    ui.getByText(/Shared suppliers stay/);
    fireEvent.click(ui.getByText('Tap again to confirm delete'));
    await ui.findByText(/Deleted "DELETE PROBE"/);
    expect(ui.queryByText('DELETE PROBE')).toBeNull();
    ui.unmount();
  });

  it('value cells are keyboard-operable with accessible names', async () => {
    const project = await createProject({ name: 'KEYBOARD PROBE' });
    await createBomItem({ projectId: project.id, item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 12, unitCost: 28 });
    const ui = render(<BomScreen projectId={project.id} />);
    const cell = await ui.findByRole('button', { name: /Edit purchase quantity, currently 12/ });
    expect(cell.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(cell, { key: 'Enter' });
    await ui.findByText('Edit purchaseQty (will lock the field)');
    ui.unmount();
  });
});
