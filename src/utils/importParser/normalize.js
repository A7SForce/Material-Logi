/**
 * normalize.js — Normalize parsed data into a consistent ParsedImport shape
 * 
 * Both readers (mdReader and xlsxReader) output through this into one shape.
 * Ensures all required fields are present, null if genuinely absent, never guessed.
 */

import { generateId } from '../helpers.js';

/**
 * Ensure an item has all required fields with proper defaults
 * @param {object} item - Raw parsed item
 * @returns {object} - Normalized item
 */
const normalizeBomItem = (item) => {
    if (!item) return null;
    
    return {
        id: item.id || generateId(),
        item: String(item.item || '').trim() || null,
        spec: item.spec != null ? String(item.spec).trim() : null,
        category: item.category != null ? String(item.category).trim() : null,
        unit: String(item.unit || 'pcs').trim(),
        netQty: typeof item.netQty === 'number' ? item.netQty : (parseFloat(item.netQty) || 0),
        wastagePct: typeof item.wastagePct === 'number' ? item.wastagePct : (parseFloat(item.wastagePct) || 0),
        purchaseQty: typeof item.purchaseQty === 'number' ? item.purchaseQty : (parseFloat(item.purchaseQty) || 0),
        unitCost: typeof item.unitCost === 'number' ? item.unitCost : (parseFloat(item.unitCost) || 0),
        estTotal: typeof item.estTotal === 'number' ? item.estTotal : (parseFloat(item.estTotal) || 0),
        basis: item.basis != null ? String(item.basis).trim() : null,
        confidence: typeof item.confidence === 'number' ? item.confidence : (parseFloat(item.confidence) || 1),
        pack: item.pack != null ? String(item.pack).trim() : null,
        notes: item.notes != null ? String(item.notes).trim() : null,
        lockedFields: item.lockedFields || []
    };
};

/**
 * Ensure a shortage/confirm item has all required fields
 * @param {object} shortageItem - Raw parsed shortage item
 * @returns {object} - Normalized shortage item
 */
const normalizeShortageItem = (shortageItem) => {
    if (!shortageItem) return null;
    
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    let severity = String(shortageItem.severity || 'medium').toLowerCase().trim();
    if (!validSeverities.includes(severity)) {
        severity = 'medium';
    }
    
    return {
        id: shortageItem.id || generateId(),
        severity: severity,
        issue: String(shortageItem.issue || '').trim(),
        missingInfo: shortageItem.missingInfo != null ? String(shortageItem.missingInfo).trim() : null,
        confirmationRequired: shortageItem.confirmationRequired != null ? String(shortageItem.confirmationRequired).trim() : null,
        owner: shortageItem.owner != null ? String(shortageItem.owner).trim() : null,
        resolved: typeof shortageItem.resolved === 'boolean' ? shortageItem.resolved : false,
        kind: shortageItem.kind || 'agent_question'
    };
};

/**
 * Ensure a supplier entry has all required fields
 * @param {object} supplier - Raw parsed supplier
 * @returns {object} - Normalized supplier
 */
const normalizeSupplier = (supplier) => {
    if (!supplier) return null;
    
    return {
        id: supplier.id || generateId(),
        businessName: supplier.businessName != null ? String(supplier.businessName).trim() : null,
        contact: supplier.contact != null ? String(supplier.contact).trim() : null,
        address: supplier.address != null ? String(supplier.address).trim() : null,
        specialty: supplier.specialty != null ? String(supplier.specialty).trim() : null,
        logisticsNote: supplier.logisticsNote != null ? String(supplier.logisticsNote).trim() : null,
        sourceUrl: supplier.sourceUrl != null ? String(supplier.sourceUrl).trim() : null
    };
};

/**
 * Ensure a changelog entry has all required fields
 * @param {object} entry - Raw parsed changelog entry
 * @returns {object} - Normalized changelog entry
 */
const normalizeChangeLogEntry = (entry) => {
    if (!entry) return null;
    
    return {
        id: entry.id || generateId(),
        description: String(entry.description || '').trim()
    };
};

/**
 * Normalize raw parsed data into the standard ParsedImport shape
 * @param {object} rawData - Raw output from mdReader or xlsxReader
 * @returns {ParsedImport} - Normalized parsed import
 * 
 * ParsedImport shape:
 * {
 *   projectTitle: string,
 *   bomItems: [{ item, spec, category, unit, netQty, wastagePct, purchaseQty, unitCost, estTotal, basis, confidence, pack, notes }],
 *   shortageConfirmItems: [{ severity, issue, missingInfo, confirmationRequired, owner, resolved, kind }],
 *   supplierEntries: [{ businessName, contact, address, specialty, logisticsNote, sourceUrl }],
 *   changeLogFromAgent: [{ description }]
 * }
 */
export const normalizeParsedData = (rawData) => {
    if (!rawData || typeof rawData !== 'object') {
        throw new Error('Invalid raw data for normalization');
    }
    
    // Normalize project title
    let projectTitle = rawData.projectTitle || '';
    if (typeof projectTitle !== 'string') {
        projectTitle = String(projectTitle || '');
    }
    projectTitle = projectTitle.trim() || 'Untitled Project';
    
    // Normalize BOM items
    const bomItems = [];
    if (Array.isArray(rawData.bomItems)) {
        for (const item of rawData.bomItems) {
            const normalized = normalizeBomItem(item);
            if (normalized && normalized.item) {
                bomItems.push(normalized);
            }
        }
    }
    
    // Normalize shortage/confirm items
    const shortageConfirmItems = [];
    if (Array.isArray(rawData.shortageConfirmItems)) {
        for (const shortageItem of rawData.shortageConfirmItems) {
            const normalized = normalizeShortageItem(shortageItem);
            if (normalized && (normalized.issue || normalized.missingInfo)) {
                shortageConfirmItems.push(normalized);
            }
        }
    }
    
    // Normalize supplier entries
    const supplierEntries = [];
    if (Array.isArray(rawData.supplierEntries)) {
        for (const supplier of rawData.supplierEntries) {
            const normalized = normalizeSupplier(supplier);
            if (normalized && (normalized.businessName || normalized.contact)) {
                supplierEntries.push(normalized);
            }
        }
    }
    
    // Normalize changelog entries
    const changeLogFromAgent = [];
    if (Array.isArray(rawData.changeLogFromAgent)) {
        for (const entry of rawData.changeLogFromAgent) {
            const normalized = normalizeChangeLogEntry(entry);
            if (normalized && normalized.description) {
                changeLogFromAgent.push(normalized);
            }
        }
    }
    
    return {
        projectTitle,
        bomItems,
        shortageConfirmItems,
        supplierEntries,
        changeLogFromAgent
    };
};

export default normalizeParsedData;
