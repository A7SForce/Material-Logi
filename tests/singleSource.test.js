/**
 * singleSource.test.js — Agent 5 (Task G2).
 * Every screen must read Dexie through the repo layer — no direct table access
 * that can silently drift from the store. Two guards:
 *   1. Static: no screen/App file imports data/db.js or touches a table handle.
 *   2. Behavioral: the G2 fix (supplierRepo.getSupplier, replacing the one
 *      bypass SuppliersScreen had) round-trips through the repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllTables } from '../src/data/db.js';
import { createSupplier, getSupplier } from '../src/data/supplierRepo.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const screensDir = path.join(dir, '..', 'src', 'screens');

beforeEach(async () => {
  await clearAllTables();
});

describe('G2: no screen bypasses the repo layer', () => {
  it('zero direct Dexie table access in src/screens + src/App.jsx', () => {
    const files = fs.readdirSync(screensDir).filter((f) => f.endsWith('.jsx'));
    files.push('../App.jsx');
    const violations = [];
    for (const f of files) {
      const src = fs.readFileSync(path.join(screensDir, f), 'utf8');
      if (/from\s+['"]\.\.\/data\/db\.js['"]/.test(src)) violations.push(`${f}: imports data/db.js`);
      const tables = src.match(/db\.(projects|bomItems|shortageItems|globalSuppliers|supplierLinks|changeLog)\b/g) || [];
      for (const t of tables) violations.push(`${f}: direct table access ${t}`);
      if (/new Dexie|indexedDB|localStorage/.test(src)) violations.push(`${f}: raw storage API`);
    }
    expect(violations).toEqual([]);
  });

  it('getSupplier round-trips through the repo (the G2 fix)', async () => {
    const created = await createSupplier({ businessName: 'G2 Probe Store', address: 'Betong' });
    const fetched = await getSupplier(created.id);
    expect({ name: fetched.businessName, address: fetched.address }).toEqual({
      name: 'G2 Probe Store',
      address: 'Betong',
    });
  });
});
