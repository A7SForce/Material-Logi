/**
 * mdReader.js — Markdown file reader for BOM imports
 * 
 * Reads the 8 markdown sections into rows. Detects sections by header text match,
 * not by fixed position. If a section is absent, its array is empty.
 */

import { generateId } from '../helpers.js';

// Section headers to detect (regex patterns)
const SECTION_PATTERNS = {
    projectTitle: [/^#\s+/, /^##\s+/, /^SURAU/i, /^PROJECT:/i],
    bomItems: [/BOM/i, /BILL\s*OF\s*MATERIALS?/i, /MATERIALS?/i, /ITEMS?/i],
    shortageConfirm: [/SHORTAGE/i, /CONFIRM/i, /MISSING\s*INFO/i, /QUESTIONS?/i],
    suppliers: [/SUPPLIER/i, /VENDOR/i, /BUSINESS/i, /CONTACT/i],
    changeLog: [/CHANGE\s*LOG/i, /REVISION/i, /HISTORY/i, /VERSION/i]
};

// Default field values for missing data
const DEFAULT_ITEM = {
    item: '',
    spec: '',
    category: '',
    unit: 'pcs',
    netQty: 0,
    wastagePct: 0,
    purchaseQty: 0,
    unitCost: 0,
    estTotal: 0,
    basis: '',
    confidence: 1,
    pack: null,
    notes: ''
};

const DEFAULT_SHORTAGE = {
    severity: 'medium',
    issue: '',
    missingInfo: '',
    confirmationRequired: '',
    owner: ''
};

const DEFAULT_SUPPLIER = {
    businessName: '',
    contact: '',
    address: '',
    specialty: '',
    logisticsNote: '',
    sourceUrl: ''
};

/**
 * Parse markdown content into structured data
 * @param {string} markdownContent - Raw markdown text
 * @returns {object} - Parsed sections
 */
const parseMarkdownContent = (markdownContent) => {
    const lines = markdownContent.split('\n');
    const result = {
        projectTitle: '',
        bomItems: [],
        shortageConfirmItems: [],
        supplierEntries: [],
        changeLogFromAgent: []
    };
    
    let currentSection = null;
    let buffer = [];
    
    const flushBuffer = () => {
        if (!currentSection || buffer.length === 0) return;
        
        switch (currentSection) {
            case 'bomItems':
                result.bomItems.push(...parseBOMBuffer(buffer));
                break;
            case 'shortageConfirm':
                result.shortageConfirmItems.push(...parseShortageBuffer(buffer));
                break;
            case 'suppliers':
                result.supplierEntries.push(...parseSupplierBuffer(buffer));
                break;
            case 'changeLog':
                result.changeLogFromAgent.push(...parseChangeLogBuffer(buffer));
                break;
            case 'projectTitle':
                result.projectTitle = extractProjectTitle(buffer);
                break;
        }
        buffer = [];
    };
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check if this line starts a new section
        const newSection = detectSection(trimmedLine);
        
        if (newSection) {
            flushBuffer();
            currentSection = newSection;
            continue;
        }
        
        // Skip empty lines at the start of a section
        if (buffer.length === 0 && trimmedLine === '') continue;
        
        buffer.push(trimmedLine);
    }
    
    // Flush remaining buffer
    flushBuffer();
    
    return result;
};

/**
 * Detect which section a line belongs to based on header patterns
 * @param {string} line - The line to check
 * @returns {string|null} - Section name or null
 */
const detectSection = (line) => {
    // Check for heading markers (#, ##, etc.)
    const headingMatch = line.match(/^(#+)\s*(.*)$/);
    if (!headingMatch) return null;
    
    const headingText = headingMatch[2];
    
    for (const [sectionName, patterns] of Object.entries(SECTION_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(headingText)) {
                return sectionName;
            }
        }
    }
    
    return null;
};

/**
 * Extract project title from buffer
 * @param {string[]} buffer - Lines in the project title section
 * @returns {string}
 */
const extractProjectTitle = (buffer) => {
    if (buffer.length === 0) return '';
    
    // Take the first non-empty line and strip markdown
    const title = buffer[0].replace(/^#+\s*/, '').trim();
    return title || 'Untitled Project';
};

/**
 * Parse BOM items from buffer lines
 * @param {string[]} buffer - Lines containing BOM data
 * @returns {Array}
 */
const parseBOMBuffer = (buffer) => {
    const items = [];
    
    // Try to detect table format (pipe-separated) or list format
    const isTable = buffer.some(line => line.includes('|'));
    
    if (isTable) {
        // Parse as markdown table
        const headers = parseTableHeader(buffer.find(l => l.includes('|') && !l.includes('---')));
        const dataLines = buffer.filter(l => l.includes('|') && !l.includes('---'));
        
        for (const line of dataLines) {
            const row = parseTableRow(line);
            if (row && row.length > 0) {
                const item = mapRowToItem(row, headers);
                if (item.item) {
                    items.push(item);
                }
            }
        }
    } else {
        // Parse as list format
        for (const line of buffer) {
            if (line.startsWith('-') || line.startsWith('*')) {
                const content = line.replace(/^[-*]\s*/, '').trim();
                const item = parseListItem(content);
                if (item.item) {
                    items.push(item);
                }
            }
        }
    }
    
    return items;
};

/**
 * Parse table header row to get column names
 * @param {string} line - Header line
 * @returns {string[]}
 */
const parseTableHeader = (line) => {
    if (!line) return [];
    return parseTableRow(line).map(h => h.toLowerCase().trim());
};

/**
 * Parse a table row into cells
 * @param {string} line - Table row line
 * @returns {string[]}
 */
const parseTableRow = (line) => {
    if (!line.includes('|')) return [];
    const parts = line.split('|');
    // Remove empty first/last elements (from leading/trailing |)
    if (parts[0] === '') parts.shift();
    if (parts[parts.length - 1] === '') parts.pop();
    return parts.map(p => p.trim());
};

/**
 * Map a table row to an item object based on headers
 * @param {string[]} row - Row cells
 * @param {string[]} headers - Column headers
 * @returns {object}
 */
const mapRowToItem = (row, headers) => {
    const item = { ...DEFAULT_ITEM, id: generateId() };
    
    // Map common column names to fields
    const fieldMap = {
        'item': 'item',
        'name': 'item',
        'material': 'item',
        'spec': 'spec',
        'specification': 'spec',
        'category': 'category',
        'unit': 'unit',
        'qty': 'netQty',
        'quantity': 'netQty',
        'net qty': 'netQty',
        'wastage': 'wastagePct',
        'wastage %': 'wastagePct',
        'purchase qty': 'purchaseQty',
        'unit cost': 'unitCost',
        'cost': 'unitCost',
        'price': 'unitCost',
        'total': 'estTotal',
        'basis': 'basis',
        'confidence': 'confidence',
        'pack': 'pack',
        'notes': 'notes',
        'note': 'notes'
    };
    
    for (let i = 0; i < row.length; i++) {
        const header = headers[i] || `col${i}`;
        const value = row[i];
        const field = fieldMap[header.toLowerCase()];
        
        if (field) {
            // Convert numeric fields
            if (['netQty', 'wastagePct', 'purchaseQty', 'unitCost', 'estTotal', 'confidence'].includes(field)) {
                item[field] = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
            } else {
                item[field] = value || '';
            }
        } else if (!item.item && value) {
            // First non-empty value becomes item name if no mapping found
            item.item = value;
        }
    }
    
    // Calculate purchaseQty from netQty and wastage if not provided
    if (item.purchaseQty === 0 && item.netQty > 0) {
        item.purchaseQty = Math.ceil(item.netQty * (1 + item.wastagePct / 100));
    }
    
    // Calculate estTotal from purchaseQty and unitCost if not provided
    if (item.estTotal === 0 && item.purchaseQty > 0 && item.unitCost > 0) {
        item.estTotal = item.purchaseQty * item.unitCost;
    }
    
    return item;
};

/**
 * Parse a list item into an item object
 * @param {string} content - List item content
 * @returns {object}
 */
const parseListItem = (content) => {
    const item = { ...DEFAULT_ITEM, id: generateId() };
    
    // Try to extract key-value pairs (e.g., "Item: XYZ, Qty: 10")
    const kvPattern = /(\w+):\s*([^,]+)/gi;
    let match;
    const kvMap = {};
    
    while ((match = kvPattern.exec(content)) !== null) {
        kvMap[match[1].toLowerCase().trim()] = match[2].trim();
    }
    
    if (Object.keys(kvMap).length > 0) {
        // Map extracted key-values
        item.item = kvMap['item'] || kvMap['name'] || kvMap['material'] || '';
        item.spec = kvMap['spec'] || kvMap['specification'] || '';
        item.category = kvMap['category'] || '';
        item.unit = kvMap['unit'] || 'pcs';
        item.netQty = parseFloat(kvMap['qty'] || kvMap['quantity'] || '0') || 0;
        item.wastagePct = parseFloat(kvMap['wastage'] || '0') || 0;
        item.purchaseQty = parseFloat(kvMap['purchase qty'] || kvMap['purchaseqty'] || '0') || 0;
        item.unitCost = parseFloat(kvMap['unit cost'] || kvMap['cost'] || kvMap['price'] || '0') || 0;
        item.estTotal = parseFloat(kvMap['total'] || '0') || 0;
        item.notes = kvMap['notes'] || kvMap['note'] || '';
    } else {
        // Fallback: treat entire content as item name
        item.item = content;
    }
    
    // Calculate derived values
    if (item.purchaseQty === 0 && item.netQty > 0) {
        item.purchaseQty = Math.ceil(item.netQty * (1 + item.wastagePct / 100));
    }
    if (item.estTotal === 0 && item.purchaseQty > 0 && item.unitCost > 0) {
        item.estTotal = item.purchaseQty * item.unitCost;
    }
    
    return item;
};

/**
 * Parse shortage/confirm items from buffer
 * @param {string[]} buffer - Lines
 * @returns {Array}
 */
const parseShortageBuffer = (buffer) => {
    const items = [];
    
    for (const line of buffer) {
        if (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./)) {
            const content = line.replace(/^[-*\d.]+\s*/, '').trim();
            const item = { ...DEFAULT_SHORTAGE, id: generateId() };
            
            // Try to extract structured data
            const severityMatch = content.match(/(high|medium|low)/i);
            if (severityMatch) {
                item.severity = severityMatch[1].toLowerCase();
            }
            
            item.issue = content;
            items.push(item);
        }
    }
    
    return items;
};

/**
 * Parse supplier entries from buffer
 * @param {string[]} buffer - Lines
 * @returns {Array}
 */
const parseSupplierBuffer = (buffer) => {
    const entries = [];
    
    for (const line of buffer) {
        if (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./)) {
            const content = line.replace(/^[-*\d.]+\s*/, '').trim();
            const entry = { ...DEFAULT_SUPPLIER, id: generateId() };
            
            // Simple parsing: assume comma-separated or colon-separated
            const parts = content.split(/[;,]/).map(p => p.trim()).filter(p => p);
            
            if (parts.length >= 1) {
                entry.businessName = parts[0];
            }
            if (parts.length >= 2) {
                entry.contact = parts[1];
            }
            if (parts.length >= 3) {
                entry.address = parts[2];
            }
            if (parts.length >= 4) {
                entry.specialty = parts[3];
            }
            
            entries.push(entry);
        }
    }
    
    return entries;
};

/**
 * Parse changelog entries from buffer
 * @param {string[]} buffer - Lines
 * @returns {Array}
 */
const parseChangeLogBuffer = (buffer) => {
    const entries = [];
    
    for (const line of buffer) {
        if (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./)) {
            const content = line.replace(/^[-*\d.]+\s*/, '').trim();
            entries.push({ id: generateId(), description: content });
        }
    }
    
    return entries;
};

/**
 * Read and parse a markdown file
 * @param {File|string} file - File object or markdown content string
 * @returns {Promise<object>} - Parsed data
 */
export const readMarkdown = async (file) => {
    let content;
    
    if (typeof file === 'string') {
        content = file;
    } else if (file && typeof file === 'object') {
        if (file.text && typeof file.text === 'function') {
            // Browser File object
            content = await file.text();
        } else if (file.content) {
            // Object with content property
            content = file.content;
        } else {
            throw new Error('Invalid file object for markdown parsing');
        }
    } else {
        throw new Error('Invalid input for markdown parsing');
    }
    
    if (!content || typeof content !== 'string') {
        throw new Error('Empty or invalid markdown content');
    }
    
    return parseMarkdownContent(content);
};

export default readMarkdown;
