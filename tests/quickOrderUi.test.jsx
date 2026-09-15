/**
 * quickOrderUi.test.jsx — Fast Ordering through the real BOM screen.
 * Groups render (Unassigned first), excluded-count shows, preview carries the
 * exact message, Send writes the traceability log, bad numbers block with a
 * fix prompt, and the Unassigned order guides instead of guessing.
 */
/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import * as bomRepo from '../src/data/bomRepo.js';
import * as shortageRepo from '../src/data/shortageRepo.js';
import * as supplierRepo from '../src/data/supplierRepo.js';
import * as changeLogRepo from '../src/data/changeLogRepo.js';
import BomScreen from '../src/screens/BomScreen.jsx';

afterEach(() => cleanup());

beforeEach(async () => {
  await clearAllTables();
});

const seedScenario = async () => {
  const project = await createProject({ name: 'QUICK ORDER PROBE' });
  const s1 = await supplierRepo.createSupplier({ businessName: 'Alpha Supplies', contact: '+6016-398 0328', address: 'Betong' });
  const s2 = await supplierRepo.createSupplier({ businessName: 'Beta Supplies', contact: 'NULL', address: 'Kuching' });
  await supplierRepo.linkSupplierToProject({ projectId: project.id, globalSupplierId: s1.id });
  await supplierRepo.linkSupplierToProject({ projectId: project.id, globalSupplierId: s2.id });
  await bomRepo.bulkCreateBomItems([
    { projectId: project.id, item: 'Widget A', spec: 'Std', unit: 'pcs', purchaseQty: 4, unitCost: 10, displayOrder: 0, assignedSupplierId: s1.id },
    { projectId: project.id, item: 'Widget B', spec: 'Std', unit: 'pcs', purchaseQty: 2, unitCost: 20, displayOrder: 1, assignedSupplierId: s1.id },
    { projectId: project.id, item: 'Widget C', spec: 'Std', unit: 'pcs', purchaseQty: 1, unitCost: 30, displayOrder: 2, assignedSupplierId: s2.id },
    { projectId: project.id, item: 'Widget D', spec: 'Std', unit: 'pcs', purchaseQty: 9, unitCost: 90, displayOrder: 3, assignedSupplierId: null },
  ]);
  await shortageRepo.createShortageItem({
    projectId: project.id, kind: 'new_item_pending', resolved: false,
    issue: 'Widget B is new', refItem: 'Widget B', refSpec: 'Std',
  });
  return { project, s1, s2 };
};

describe('Quick Order UI flow', () => {
  it('groups Unassigned-first, excludes pending items visibly, sends with log', async () => {
    const { project } = await seedScenario();
    const ui = render(<BomScreen projectId={project.id} onGoSuppliers={() => {}} />);
    await ui.findByText('Widget D');

    // Unassigned group leads; supplier groups follow with counts.
    const headings = ui.container.querySelectorAll('h2');
    expect(headings[0].textContent).toBe('Unassigned (1)');
    ui.getByText('Alpha Supplies (2)');
    ui.getByText('Beta Supplies (1)');

    // Supplier order: preview shows only the eligible line + excluded count.
    const alpha = ui.getByRole('region', { name: 'Alpha Supplies' });
    fireEvent.click(within(alpha).getByText('Order via WhatsApp'));
    // Preview <pre> holds the whole message: assert by substring.
    await ui.findByText(/1\. Widget A — Std — 4 pcs/);
    expect(ui.queryByText(/Widget B —/)).toBeNull();
    ui.getByText(/1 items pending confirmation — excluded from this order/);

    // R3 note appends live; Send writes the traceability entry.
    fireEvent.change(ui.getByLabelText(/Note/), { target: { value: 'need by Friday' } });
    ui.getByText(/Note: need by Friday/);
    fireEvent.click(ui.getByText('Send via WhatsApp'));
    const log = await changeLogRepo.listChangeLog(project.id);
    const sent = log.filter((e) => e.actor === 'supervisor' && e.field === 'quick_order_sent');
    expect(sent).toHaveLength(1);
    expect(sent[0].newValue).toMatch(/Alpha Supplies · 1 items.*need by Friday/);
    ui.unmount();
  });

  it('unusable numbers block with a fix prompt, not a silent failure', async () => {
    const { project } = await seedScenario();
    const ui = render(<BomScreen projectId={project.id} onGoSuppliers={() => {}} />);
    await ui.findByText('Widget D');
    const beta = ui.getByRole('region', { name: 'Beta Supplies' });
    fireEvent.click(within(beta).getByText('Order via WhatsApp'));
    await ui.findByText('Send via WhatsApp');
    fireEvent.click(ui.getByText('Send via WhatsApp'));
    await ui.findByText(/Fix Beta Supplies's phone number before ordering/);
    ui.getByText('Fix in Suppliers');
    ui.unmount();
  });

  it('Unassigned order guides instead of guessing', async () => {
    const { project } = await seedScenario();
    const ui = render(<BomScreen projectId={project.id} onGoSuppliers={() => {}} />);
    await ui.findByText('Widget D');
    const unassigned = ui.getByRole('region', { name: 'Unassigned' });
    fireEvent.click(within(unassigned).getByText('Order via WhatsApp'));
    await ui.findByText(/Pick a supplier on each row above first/);
    ui.unmount();
  });
});
