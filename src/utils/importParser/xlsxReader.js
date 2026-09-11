/**
 * xlsxReader.js — Excel file reader for BOM imports
 * 
 * Reads the 8 Excel sheet tabs into rows. Detects sections by header text match,
 * not by fixed position. If a section is absent, its array is empty.
 */

import * as XLSX from 'xlsx';
import { generateId } from '../helpers.js';

// Sheet name patterns to detect sections
const SECTION_PATTERNS = {
    bomItems: [/BOM/i, /MATERIALS?/i, /ITEMS?/i, /PURCHASE/i, /TABLE\s*\d+/i],
    shortageConfirm: [/SHORTAGE/i, /CONFIRM/i, /QUESTIONS?/i, /ISSUES?/i],
    suppliers: [/SUPPLIER/i, /VENDOR/i, /CONTACT/i, /BUSINESS/i],
    changeLog: [/CHANGE/i, /LOG/i, /REVISION/i, /HISTORY/i, /VERSION/i]
};

// Default field values
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
 * Detect which section a sheet belongs to based on sheet name
 * @param {string} sheetName - The sheet name
 * @returns {string|null} - Section name or null
 */
const detectSectionFromSheetName = (sheetName) => {
    for (const [sectionName, patterns] of Object.entries(SECTION_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(sheetName)) {
                return sectionName;
            }
        }
    }
    
    // Default to bomItems if it looks like a data sheet
    if (/^TABLE\s*\d+$/i.test(sheetName) || !/^(COVER|SUMMARY|INDEX|NOTES)$/i.test(sheetName)) {
        return 'bomItems';
    }
    
    return null;
};

/**
 * Find header row in a sheet
 * @param {object} sheet - XLSX sheet object
 * @param {number} maxRows - Maximum rows to check
 * @returns {number|null} - Header row index (0-based) or null
 */
const findHeaderRow = (sheet, maxRows = 10) => {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    
    for (let R = range.s.r; R <= Math.min(range.e.r, maxRows - 1); R++) {
        let hasHeaderLikeContent = false;
        
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
            if (!cell) continue;
            
            const value = String(cell.v || '').toLowerCase().trim();
            
            // Check if this looks like a header
            if (value.includes('item') || value.includes('qty') || value.includes('quantity') ||
                value.includes('unit') || value.includes('price') || value.includes('cost') ||
                value.includes('total') || value.includes('category') || value.includes('spec')) {
                hasHeaderLikeContent = true;
                break;
            }
        }
        
        if (hasHeaderLikeContent) {
            return R;
        }
    }
    
    return range.s.r; // Default to first row
};

/**
 * Map column headers to field names
 * @param {string[]} headers - Column headers
 * @returns {object} - Mapping from column index to field name
 */
const mapColumnsToFields = (headers) => {
    const mapping = {};
    const fieldPatterns = {
        'item': [/^item$/i, /^name$/i, /^material$/i, /^description$/i],
        'spec': [/^spec$/i, /^specification$/i, /^desc$/i],
        'category': [/^category$/i, /^cat$/i, /^type$/i, /^section$/i],
        'unit': [/^unit$/i, /^uom$/i, /^measure$/i],
        'netQty': [/^net\s*qty$/i, /^qty$/i, /^quantity$/i, /^net\s*quantity$/i],
        'wastagePct': [/^wastage/i, /^waste/i, /^loss/i, /^overage/i],
        'purchaseQty': [/^purchase\s*qty$/i, /^order\s*qty$/i, /^buy\s*qty$/i, /^req\s*qty$/i],
        'unitCost': [/^unit\s*cost$/i, /^cost$/i, /^price$/i, /^rate$/i, /^unit\s*price$/i],
        'estTotal': [/^total$/i, /^amount$/i, /^sum$/i, /^extended$/i],
        'basis': [/^basis$/i, /^reason$/i, /^note$/i],
        'confidence': [/^confidence$/i, /^certainty$/i, /^reliability$/i],
        'pack': [/^pack$/i, /^package$/i, /^packing$/i],
        'notes': [/^notes?$/i, /^remarks?$/i, /^comments?$/i]
    };
    
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        
        for (const [field, patterns] of Object.entries(fieldPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(header)) {
                    mapping[i] = field;
                    break;
                }
            }
            if (mapping[i]) break;
        }
    }
    
    return mapping;
};

/**
 * Parse a single sheet into items
 * @param {object} sheet - XLSX sheet object
 * @param {string} sectionType - Type of section ('bomItems', 'shortageConfirm', etc.)
 * @param {string} sheetName - Name of the sheet (for category)
 * @returns {Array}
 */
const parseSheet = (sheet, sectionType, sheetName) => {
    const result = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    
    if (range.e.r < range.s.r) return result;
    
    const headerRow = findHeaderRow(sheet);
    
    // Read headers
    const headers = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c: C })];
        headers.push(cell ? String(cell.v || '').trim() : `col${C}`);
    }
    
    const columnMapping = mapColumnsToFields(headers);
    
    // Find category from headers or sheet name
    let category = sheetName;
    for (let C = 0; C < headers.length; C++) {
        if (/^category$/i.test(headers[C]) || /^cat$/i.test(headers[C])) {
            // Category will be read from data rows
            break;
        }
    }
    
    // Parse data rows
    for (let R = headerRow + 1; R <= range.e.r; R++) {
        const rowData = {};
        let hasData = false;
        
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
            if (!cell) continue;
            
            const value = cell.w != null ? cell.w : cell.v;
            if (value !== null && value !== undefined && value !== '') {
                hasData = true;
                
                const field = columnMapping[C];
                if (field) {
                    // Convert numeric fields
                    if (['netQty', 'wastagePct', 'purchaseQty', 'unitCost', 'estTotal', 'confidence'].includes(field)) {
                        rowData[field] = parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
                    } else {
                        rowData[field] = String(value).trim();
                    }
                }
            }
        }
        
        if (!hasData) continue;
        
        if (sectionType === 'bomItems') {
            const item = { ...DEFAULT_ITEM, id: generateId(), ...rowData };
            
            // Use sheet name as category if not specified
            if (!item.category) {
                item.category = category;
            }
            
            // Calculate derived values
            if (item.purchaseQty === 0 && item.netQty > 0) {
                item.purchaseQty = Math.ceil(item.netQty * (1 + item.wastagePct / 100));
            }
            if (item.estTotal === 0 && item.purchaseQty > 0 && item.unitCost > 0) {
                item.estTotal = item.purchaseQty * item.unitCost;
            }
            
            if (item.item) {
                result.push(item);
            }
        } else if (sectionType === 'shortageConfirm') {
            const shortageItem = { ...DEFAULT_SHORTAGE, id: generateId(), ...rowData };
            if (shortageItem.issue || shortageItem.missingInfo) {
                result.push(shortageItem);
            }
        } else if (sectionType === 'suppliers') {
            const supplier = { ...DEFAULT_SUPPLIER, id: generateId(), ...rowData };
            if (supplier.businessName || supplier.contact) {
                result.push(supplier);
            }
        } else if (sectionType === 'changeLog') {
            if (rowData.description || rowData.note) {
                result.push({ id: generateId(), description: rowData.description || rowData.note || '' });
            }
        }
    }
    
    return result;
};

/**
 * Extract project title from workbook
 * @param {object} workbook - XLSX workbook
 * @returns {string}
 */
const extractProjectTitle = (workbook) => {
    // Try to find a COVER or SUMMARY sheet
    const coverSheetName = workbook.SheetNames.find(n => 
        /^(COVER|SUMMARY|PROJECT|TITLE)$/i.test(n)
    );
    
    if (coverSheetName) {
        const sheet = workbook.Sheets[coverSheetName];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        
        // Look for project title in first few cells
        for (let R = range.s.r; R <= Math.min(range.e.r, 5); R++) {
            for (let C = range.s.c; C <= Math.min(range.e.c, 2); C++) {
                const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
                if (cell) {
                    const value = String(cell.v || '').trim();
                    if (value && value.length > 3 && value.length < 100) {
                        // Skip generic labels
                        if (!/^(project|title|name|date|client):/i.test(value)) {
                            return value;
                        }
                    }
                }
            }
        }
    }
    
    // Fallback: use first non-data sheet name or filename
    return 'Untitled Project';
};

/**
 * Read and parse an Excel file
 * @param {File|ArrayBuffer} file - File object or ArrayBuffer
 * @returns {Promise<object>} - Parsed data
 */
export const readExcel = async (file) => {
    let buffer;
    
    try {
        if (file instanceof ArrayBuffer) {
            buffer = file;
        } else if (file && typeof file === 'object') {
            if (file.arrayBuffer && typeof file.arrayBuffer === 'function') {
                // Browser File object
                buffer = await file.arrayBuffer();
            } else if (file.buffer instanceof ArrayBuffer) {
                // Node.js Buffer-like object
                buffer = file.buffer;
            } else {
                throw new Error('Invalid file object for Excel parsing');
            }
        } else {
            throw new Error('Invalid input for Excel parsing');
        }
    } catch (error) {
        if (error.message.includes('Invalid') || error.message.includes('Invalid input')) {
            throw error;
        }
        throw new Error(`Failed to read file: ${error.message}`);
    }
    
    try {
        const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true });
        
        const result = {
            projectTitle: extractProjectTitle(workbook),
            bomItems: [],
            shortageConfirmItems: [],
            supplierEntries: [],
            changeLogFromAgent: []
        };
        
        // Process each sheet
        for (const sheetName of workbook.SheetNames) {
            const sectionType = detectSectionFromSheetName(sheetName);
            
            if (!sectionType) continue;
            
            const sheet = workbook.Sheets[sheetName];
            const items = parseSheet(sheet, sectionType, sheetName);
            
            switch (sectionType) {
                case 'bomItems':
                    result.bomItems.push(...items);
                    break;
                case 'shortageConfirm':
                    result.shortageConfirmItems.push(...items);
                    break;
                case 'suppliers':
                    result.supplierEntries.push(...items);
                    break;
                case 'changeLog':
                    result.changeLogFromAgent.push(...items);
                    break;
            }
        }
        
        return result;
        
    } catch (error) {
        if (error.message.includes('Missing required') || 
            error.message.includes('No materials extracted')) {
            throw error;
        }
        throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
};

export default readExcel;
