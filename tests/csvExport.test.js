/**
 * csvExport.test.js — Agent 3: fixed order, header-only empty, tag round-trip.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import { createSupplier } from '../src/data/supplierRepo.js';
import { buildSupplierCsv, exportSupplierDirectory, EXPORT_COLUMNS } from '../src/utils/csvImport/csvExport.js';
import { parseSupplierCsv } from '../src/utils/csvImport/csvReader.js';

beforeEach(async () => {
  await clearAllTables();
});

describe('buildSupplierCsv', () => {
  it('emits the exact fixed column order', () => {
    expect(EXPORT_COLUMNS).toEqual([
      'businessName', 'contact', 'address', 'specialty', 'logisticsNote', 'tags', 'sourceUrl',
    ]);
    const csv = buildSupplierCsv([{
      businessName: 'Acme', contact: '+6016', address: 'Betong', specialty: 'HW',
      logisticsNote: 'Local', tags: ['a', 'b'], sourceUrl: 'https://x',
    }]);
    const [header, row] = csv.split('\n');
    expect(header).toBe('businessName,contact,address,specialty,logisticsNote,tags,sourceUrl');
    expect(row).toBe('Acme,+6016,Betong,HW,Local,a;b,https://x');
  });

  it('quotes fields containing commas or quotes', () => {
    const csv = buildSupplierCsv([{ businessName: 'Acme, "Best" Sdn', contact: '', address: '', specialty: '', logisticsNote: '', tags: [], sourceUrl: '' }]);
    expect(csv.split('\n')[1]).toBe('"Acme, ""Best"" Sdn",,,,,,');
  });

  it('empty directory exports header-only, not an error', () => {
    expect(buildSupplierCsv([])).toBe('businessName,contact,address,specialty,logisticsNote,tags,sourceUrl');
  });

  it('tags round-trip through join/split exactly', async () => {
    await createSupplier({ businessName: 'Acme', tags: ['Hardware', 'Paint & Coatings'] });
    const csv = await exportSupplierDirectory();
    const { validRows, rejectedRows } = parseSupplierCsv(csv);
    expect(rejectedRows).toEqual([]);
    expect(validRows).toHaveLength(1);
    expect(validRows[0].tags).toEqual(['Hardware', 'Paint & Coatings']);
  });
});
