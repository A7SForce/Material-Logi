/**
 * bomCategoryView.test.jsx — Ticket 5: display-only category grouping.
 * Grouped view shows every item exactly once under alpha-ordered categories;
 * toggling back to flat reproduces displayOrder exactly; stored displayOrder
 * values are untouched by viewing (prove with a repo re-read). Merge/matching
 * are not involved — this file would fail identically if they were.
 */
/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import { bulkCreateBomItems, listBomItems } from '../src/data/bomRepo.js';
import BomScreen from '../src/screens/BomScreen.jsx';

afterEach(() => cleanup());
beforeEach(async () => {
  await clearAllTables();
});

const seedFour = async () => {
  const project = await createProject({ name: 'CATEGORY PROBE' });
  // Deliberately NOT in category order: proves grouping is a view transform.
  await bulkCreateBomItems([
    { projectId: project.id, item: 'Paint A', spec: 'S', category: 'Paint', purchaseQty: 1, unitCost: 1, displayOrder: 0 },
    { projectId: project.id, item: 'Board A', spec: 'S', category: 'Boards', purchaseQty: 1, unitCost: 1, displayOrder: 1 },
    { projectId: project.id, item: 'Paint B', spec: 'S', category: 'Paint', purchaseQty: 1, unitCost: 1, displayOrder: 2 },
    { projectId: project.id, item: 'Board B', spec: 'S', category: 'Boards', purchaseQty: 1, unitCost: 1, displayOrder: 3 },
  ]);
  return project;
};

const visibleItemNames = (container) =>
  [...container.querySelectorAll('.row > div:first-child > strong')].map((el) => el.textContent);

describe('Ticket 5: category grouping is view-only', () => {
  it('groups alpha-by-category with no drops, flat toggle restores displayOrder', async () => {
    const project = await seedFour();
    const ui = render(<BomScreen projectId={project.id} onGoSuppliers={() => {}} />);
    await ui.findByText('Paint A');

    fireEvent.click(ui.getByText('Category', { selector: 'button' }));
    await ui.findByText('Boards (2)');
    ui.getByText('Paint (2)');
    // Alpha category order, displayOrder preserved inside each group.
    expect(visibleItemNames(ui.container)).toEqual(['Board A', 'Board B', 'Paint A', 'Paint B']);

    fireEvent.click(ui.getByText('All', { selector: 'button' }));
    expect(visibleItemNames(ui.container)).toEqual(['Paint A', 'Board A', 'Paint B', 'Board B']);
    // # badges still global displayOrder positions.
    expect(
      [...ui.container.querySelectorAll('.row .badge')].map((b) => b.textContent).filter((t) => /^\d+$/.test(t))
    ).toEqual(['1', '2', '3', '4']);
    ui.unmount();

    // Storage untouched by all that viewing.
    const rows = await listBomItems(project.id);
    expect(rows.map((r) => [r.item, r.displayOrder]).sort((a, b) => a[1] - b[1])).toEqual([
      ['Paint A', 0], ['Board A', 1], ['Paint B', 2], ['Board B', 3],
    ]);
  });
});
