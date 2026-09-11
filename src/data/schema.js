/**
 * schema.js — Database schema definitions
 * 
 * Table definitions for IndexedDB storage.
 */

// Project table schema
export const PROJECT_SCHEMA = {
    name: 'projects',
    fields: {
        id: '++id',           // Auto-increment primary key
        name: 'string',        // Project name (indexed)
        location: 'string',    // Project location
        createdAt: 'number'    // Timestamp (indexed)
    },
    indexes: ['name', 'createdAt']
};

// BOM item table schema
export const BOM_ITEM_SCHEMA = {
    name: 'bomItems',
    fields: {
        id: '++id',            // Auto-increment primary key
        projectId: 'number',   // Foreign key to projects (indexed)
        item: 'string',        // Item name (indexed)
        spec: 'string',        // Specification (indexed)
        category: 'string',    // Category (indexed)
        netQty: 'number',      // Net quantity
        wastagePct: 'number',  // Wastage percentage
        purchaseQty: 'number', // Purchase quantity
        unitCost: 'number',    // Unit cost
        estTotal: 'number',    // Estimated total
        basis: 'string',       // Basis/reasoning
        confidence: 'number',  // Confidence level (0-1)
        notes: 'string',       // Notes
        lockedFields: 'array'  // Array of locked field names
    },
    indexes: ['projectId', 'item', 'spec', 'category']
};

// Shortage/Confirm item table schema
export const SHORTAGE_CONFIRM_SCHEMA = {
    name: 'shortageConfirmItems',
    fields: {
        id: '++id',                  // Auto-increment primary key
        projectId: 'number',         // Foreign key to projects (indexed)
        severity: 'string',          // low|medium|high|critical
        issue: 'string',             // Description of the issue
        missingInfo: 'string',       // What info is missing
        confirmationRequired: 'string', // What needs confirmation
        owner: 'string',             // Who owns resolving this
        resolved: 'boolean',         // Whether resolved (indexed)
        kind: 'string'               // agent_question|new_item_pending|removed_item_pending (indexed)
    },
    indexes: ['projectId', 'resolved', 'kind']
};

// Global supplier table schema
export const GLOBAL_SUPPLIER_SCHEMA = {
    name: 'globalSuppliers',
    fields: {
        id: '++id',            // Auto-increment primary key
        businessName: 'string', // Business name (indexed)
        contact: 'string',     // Contact person/info
        address: 'string',     // Address
        specialty: 'string',   // Specialty (indexed)
        sourceUrl: 'string',   // Source URL
        tags: 'array'          // Tags array
    },
    indexes: ['businessName', 'specialty']
};

// Project-Supplier link table schema
export const PROJECT_SUPPLIER_LINK_SCHEMA = {
    name: 'projectSupplierLinks',
    fields: {
        projectId: 'number',           // Foreign key to projects
        globalSupplierId: 'number',    // Foreign key to globalSuppliers
        assignedToItemId: 'number'     // Optional: specific BOM item
    },
    // Compound index for efficient lookups
    indexes: ['[projectId+globalSupplierId]', 'projectId', 'globalSupplierId', 'assignedToItemId']
};

// Change log entry table schema
export const CHANGE_LOG_SCHEMA = {
    name: 'changeLogEntries',
    fields: {
        id: '++id',            // Auto-increment primary key
        projectId: 'number',   // Foreign key to projects (indexed)
        timestamp: 'number',   // When the change occurred (indexed)
        actor: 'string',       // agent|supervisor (indexed)
        field: 'string',       // Which field changed
        oldValue: 'any',       // Previous value
        newValue: 'any'        // New value
    },
    indexes: ['projectId', 'timestamp', 'actor']
};

// Full database schema for Dexie
export const DB_SCHEMA = {
    version: 1,
    stores: {
        projects: '++id, name, createdAt',
        bomItems: '++id, projectId, item, spec, category',
        shortageConfirmItems: '++id, projectId, kind, resolved',
        globalSuppliers: '++id, businessName, specialty',
        projectSupplierLinks: '[projectId+globalSupplierId], projectId, globalSupplierId, assignedToItemId',
        changeLogEntries: '++id, projectId, timestamp, actor'
    }
};

export default DB_SCHEMA;
