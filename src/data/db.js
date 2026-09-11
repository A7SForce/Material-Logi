/**
 * db.js — Agent 2: IndexedDB setup (Dexie). Local, on-device, survives app close.
 * No server for this version.
 */
import Dexie from 'dexie';
import { DB_NAME, STORES } from './schema.js';

export const db = new Dexie(DB_NAME);

db.version(1).stores(STORES);

/** Close the DB (used by tests to simulate "close the app"). */
export const closeDb = () => db.close();

/** Re-open the DB (used by tests to simulate "reopen the app"). */
export const openDb = () => db.open();

/** Delete all rows in every table (test isolation only — never call in UI). */
export const clearAllTables = async () => {
  await db.transaction(
    'rw',
    [db.projects, db.bomItems, db.shortageItems, db.globalSuppliers, db.supplierLinks, db.changeLog],
    async () => {
      await Promise.all([
        db.projects.clear(),
        db.bomItems.clear(),
        db.shortageItems.clear(),
        db.globalSuppliers.clear(),
        db.supplierLinks.clear(),
        db.changeLog.clear(),
      ]);
    }
  );
};

export default db;
