/**
 * supplierCsvImport.test.js — Agent 2: skip-default, flag-gated overwrite,
 * create-on-miss, dry-run purity, and the round-trip proof (export → re-import
 * yields zero new rows).
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import * as supplierRepo from '../src/data/supplierRepo.js';
import { importSupplierRows } from '../src/logic/supplierCsvImport.js';
import { exportSupplierDirectory, buildSupplierCsv } from '../src/utils/csvImport/csvExport.js';
import { parseSupplierCsv } from '../src/utils/csvImport/csvReader.js';

const deps = {
  listSuppliers: supplierRepo.listSuppliers,
  createSupplier: supplierRepo.createSupplier,
  updateSupplier: supplierRepo.updateSupplier,
};

beforeEach(async () => {
  await clearAllTables();
});

describe('importSupplierRows', () => {
  it('creates on miss and reports counts', async () => {
    const summary = await importSupplierRows([
      { businessName: 'Acme', contact: '+6016', address: 'Betong', specialty: '', logisticsNote: '', tags: ['HW'], sourceUrl: '' },
      { businessName: 'Beta', contact: '', address: '', specialty: '', logisticsNote: '', tags: [], sourceUrl: '' },
    ], {}, deps);
    expect(summary).toMatchObject({ created: 2, skipped: 0, updated: 0 });
    expect(await supplierRepo.listSuppliers()).toHaveLength(2);
  });

  it('match skips by default, even with different field values', async () => {
    await supplierRepo.createSupplier({ businessName: 'Acme', address: 'Betong', contact: 'OLD' });
    const summary = await importSupplierRows([
      { businessName: 'Acme', contact: 'NEW', address: 'Betong', specialty: '', logisticsNote: '', tags: [], sourceUrl: '' },
    ], {}, deps);
    expect(summary).toMatchObject({ created: 0, skipped: 1, updated: 0 });
    const [row] = await supplierRepo.listSuppliers();
    expect(row.contact).toBe('OLD'); // untouched
  });

  it('overwrite flag updates only non-blank fields, never the name', async () => {
    await supplierRepo.createSupplier({ businessName: 'Acme', address: 'Betong', contact: 'OLD', specialty: 'KeepMe' });
    const summary = await importSupplierRows([
      { businessName: 'Acme', contact: 'NEW', address: 'Betong', specialty: '', logisticsNote: '', tags: ['New-Tag'], sourceUrl: '' },
    ], { overwriteExisting: true }, deps);
    expect(summary).toMatchObject({ created: 0, skipped: 0, updated: 1 });
    const [row] = await supplierRepo.listSuppliers();
    expect(row).toMatchObject({ businessName: 'Acme', contact: 'NEW', specialty: 'KeepMe' });
    expect(row.tags).toEqual(['New-Tag']);
    expect(row.address).toBe('Betong'); // blank cell did not erase
  });

  it('dryRun counts identically with zero writes', async () => {
    await supplierRepo.createSupplier({ businessName: 'Acme', address: 'Betong' });
    const rows = [
      { businessName: 'Acme', contact: '', address: 'Betong', specialty: '', logisticsNote: '', tags: [], sourceUrl: '' },
      { businessName: 'Fresh', contact: '', address: '', specialty: '', logisticsNote: '', tags: [], sourceUrl: '' },
    ];
    const dry = await importSupplierRows(rows, { dryRun: true }, deps);
    expect(dry).toMatchObject({ created: 1, skipped: 1, updated: 0 });
    expect(await supplierRepo.listSuppliers()).toHaveLength(1); // nothing written
    const live = await importSupplierRows(rows, {}, deps);
    expect(live).toMatchObject(dry);
    expect(await supplierRepo.listSuppliers()).toHaveLength(2);
  });

  it('round-trip: export then re-import creates zero new rows', async () => {
    await supplierRepo.createSupplier({ businessName: 'Acme, "Best" Sdn', contact: '+6016-398 0328', address: 'No 24, Betong', specialty: 'HW', sourceUrl: 'https://x', tags: ['a', 'b'] });
    await supplierRepo.createSupplier({ businessName: 'Beta', contact: 'NULL', address: '', specialty: '', sourceUrl: '', tags: [] });
    const csv = await exportSupplierDirectory();
    const { validRows, rejectedRows } = parseSupplierCsv(csv);
    expect(rejectedRows).toEqual([]);
    const summary = await importSupplierRows(validRows, {}, deps);
    expect(summary).toMatchObject({ created: 0, skipped: 2, updated: 0 });
    expect(await supplierRepo.listSuppliers()).toHaveLength(2);
  });
});
