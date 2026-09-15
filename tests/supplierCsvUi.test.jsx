/**
 * supplierCsvUi.test.jsx — Agent 4: confirm-before-commit blocks the write.
 * Seed one supplier, drive an import (1 existing + 1 new + 1 nameless row):
 * preview shows exact counts while the directory is untouched; only Confirm
 * writes, and the summary names created/skipped/rejected explicitly.
 */
/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { clearAllTables } from '../src/data/db.js';
import { createProject } from '../src/data/projectRepo.js';
import { createSupplier, listSuppliers, linkSupplierToProject } from '../src/data/supplierRepo.js';
import SuppliersScreen from '../src/screens/SuppliersScreen.jsx';

afterEach(() => cleanup());
beforeEach(async () => {
  await clearAllTables();
});

const CSV = [
  'businessName,contact,address',
  'Existing Store,+6016,Betong',
  'Fresh Store,,Kuching',
  ',555,Nowhere',
].join('\n');

describe('CSV import confirm-before-commit', () => {
  it('preview commits nothing; Confirm writes and summarizes', async () => {
    const project = await createProject({ name: 'CSV UI PROBE' });
    const existing = await createSupplier({ businessName: 'Existing Store', address: 'Betong', contact: 'OLD' });
    await linkSupplierToProject({ projectId: project.id, globalSupplierId: existing.id });

    const ui = render(<SuppliersScreen projectId={project.id} />);
    await ui.findByText('Existing Store');
    const input = ui.container.querySelector('#csv-file-input');
    fireEvent.change(input, {
      target: { files: [new File([CSV], 'suppliers.csv', { type: 'text/csv' })] },
    });

    // Preview with exact counts — directory still untouched.
    await ui.findByText(/1 will be created, 1 already/);
    ui.getByText(/1 rejected \(row 4: missing business name\)/);
    expect(await listSuppliers()).toHaveLength(1);

    fireEvent.click(ui.getByText('Confirm import'));
    await ui.findByText(/1 created · 1 already existed \(skipped\) · 1 rejected/);
    expect(await listSuppliers()).toHaveLength(2);
    const names = (await listSuppliers()).map((s) => s.businessName);
    expect(names).toContain('Fresh Store');
    ui.unmount();
  });
});
