/**
 * db.js — IndexedDB setup using Dexie for simpler API
 * 
 * Local, on-device storage that survives closing the app. No server for this version.
 */

import Dexie from 'dexie';

// Create the database instance
const db = new Dexie('LogisticsHelperDB');

// Define schema (matches schema.js definitions)
db.version(1).stores({
    projects: '++id, name, createdAt',
    bomItems: '++id, projectId, item, spec, category',
    shortageConfirmItems: '++id, projectId, kind, resolved',
    globalSuppliers: '++id, businessName, specialty',
    projectSupplierLinks: '[projectId+globalSupplierId], projectId, globalSupplierId, assignedToItemId',
    changeLogEntries: '++id, projectId, timestamp, actor'
});

// Open the database
db.open().catch((err) => {
    console.error('Failed to open IndexedDB:', err);
});

export default db;
