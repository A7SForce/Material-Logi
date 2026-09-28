/**
 * syncStatus.test.js — Lane 2 gating contract.
 * Without VITE_DEXIE_CLOUD_URL (the test environment), the cloud addon never
 * registers: plain Dexie, no configuration, honest "Local only" chip.
 * If this test ever fails, something started configuring cloud in the test
 * build — that must never happen silently.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import db from '../src/data/db.js';
import { isSyncEnabled, getSyncInfo, syncStatusLabel } from '../src/data/syncStatus.js';

describe('Lane 2: sync stays inert without a configured database URL', () => {
  it('cloud is not configured in the test build', () => {
    expect(isSyncEnabled()).toBe(false);
    // The addon never registered: db.cloud is absent or unconfigured.
    expect(db.cloud && db.cloud.options && db.cloud.options.databaseUrl).toBeFalsy();
  });

  it('getSyncInfo returns null and the chip honestly says Local only', () => {
    expect(getSyncInfo()).toBe(null);
    expect(syncStatusLabel(null)).toBe('Local only');
    expect(syncStatusLabel({ status: 'online', lastSync: new Date() })).toBe('Synced');
    expect(syncStatusLabel({ status: 'offline', lastSync: null })).toBe('Offline — changes saved here, will sync');
    expect(syncStatusLabel({ status: 'syncing', lastSync: null })).toBe('Syncing…');
  });

  it('generateId produces globally-unique ids (sync collision model)', async () => {
    const { generateId } = await import('../src/utils/helpers.js');
    const ids = new Set(Array.from({ length: 500 }, () => generateId()));
    expect(ids.size).toBe(500); // all unique
  });
});
