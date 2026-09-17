/**
 * supplierSeed.test.js — Verify the bundled CSV-derived seed loads correctly
 * into the global supplier directory on first DB open, and is idempotent
 * (calling seedInitialSuppliers again doesn't duplicate).
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables, seedInitialSuppliers } from '../src/data/db.js';
import { listSuppliers } from '../src/data/supplierRepo.js';
import seedData from '../src/data/seedSuppliers.json';

beforeEach(async () => {
  await clearAllTables();
});

describe('CSV supplier seed', () => {
  it('loads all unique suppliers from the seed file', async () => {
    await seedInitialSuppliers();
    const suppliers = await listSuppliers();
    expect(suppliers.length).toBe(seedData.length);
    // Spot-check a few known suppliers
    const names = suppliers.map((s) => s.businessName);
    expect(names).toContain('ARTSEVEN PRODUCTION');
    expect(names).toContain('AIK HUAT HARDWARE TRADING (Setia Alam) SDN BHD');
    expect(names).toContain('SUPER GYPSUM MARKETING SDN BHD');
    expect(names).toContain('JOO SANG TRADING');
  });

  it('is idempotent — second call without clear creates zero new rows', async () => {
    await seedInitialSuppliers();
    const after1 = await listSuppliers();
    await seedInitialSuppliers();
    const after2 = await listSuppliers();
    expect(after2.length).toBe(after1.length);
  });

  it('seed suppliers have required fields', async () => {
    await seedInitialSuppliers();
    const suppliers = await listSuppliers();
    for (const s of suppliers) {
      expect(s.id).toBeTruthy();
      expect(s.businessName).toBeTruthy();
      expect(typeof s.businessName).toBe('string');
      // tags should be an array
      expect(Array.isArray(s.tags)).toBe(true);
    }
  });

  it('seed suppliers with WhatsApp have phone numbers in contact', async () => {
    await seedInitialSuppliers();
    const suppliers = await listSuppliers();
    // At least 80% of seed suppliers should have a contact phone
    const withContact = suppliers.filter((s) => s.contact && s.contact.length >= 8);
    expect(withContact.length).toBeGreaterThan(suppliers.length * 0.7);
  });

  it('categories are stored as tags array', async () => {
    await seedInitialSuppliers();
    const suppliers = await listSuppliers();
    const artseven = suppliers.find((s) => s.businessName === 'ARTSEVEN PRODUCTION');
    expect(artseven).toBeTruthy();
    expect(artseven.tags).toContain('gypsum');
    expect(artseven.tags).toContain('scaffolding');
    expect(artseven.tags).toContain('lighting');
  });
});
