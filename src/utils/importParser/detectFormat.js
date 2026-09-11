/**
 * detectFormat.js — Format detection and routing for import files
 * 
 * Checks file extension and routes to the appropriate reader (mdReader or xlsxReader).
 * Returns a unified ParsedImport shape regardless of input format.
 */

import { readMarkdown } from './mdReader.js';
import { readExcel } from './xlsxReader.js';
import { normalizeParsedData } from './normalize.js';

const MD_EXTENSIONS = ['.md', '.markdown'];
const XLSX_EXTENSIONS = ['.xlsx', '.xls'];

/**
 * Detect file format from filename/extension
 * @param {string} filename - The name of the file
 * @returns {string|null} - 'md', 'xlsx', or null if unsupported
 */
export const detectFileFormat = (filename) => {
    if (!filename || typeof filename !== 'string') return null;
    
    const lowerFilename = filename.toLowerCase();
    
    if (MD_EXTENSIONS.some(ext => lowerFilename.endsWith(ext))) {
        return 'md';
    }
    
    if (XLSX_EXTENSIONS.some(ext => lowerFilename.endsWith(ext))) {
        return 'xlsx';
    }
    
    return null;
};

/**
 * Parse an import file (either .md or .xlsx) into a unified ParsedImport shape
 * @param {File|ArrayBuffer|string} file - The file to parse (File object for browser, ArrayBuffer/path for node)
 * @param {string} [formatHint] - Optional format hint ('md' or 'xlsx'), auto-detected if not provided
 * @returns {Promise<ParsedImport>} - Unified parsed data structure
 * 
 * ParsedImport shape:
 * {
 *   projectTitle: string,
 *   bomItems: [{ item, spec, category, unit, netQty, wastagePct, purchaseQty, unitCost, estTotal, basis, confidence, pack, notes }],
 *   shortageConfirmItems: [{ severity, issue, missingInfo, confirmationRequired, owner }],
 *   supplierEntries: [{ businessName, contact, address, specialty, logisticsNote, sourceUrl }],
 *   changeLogFromAgent: [{ description }]
 * }
 */
export const parseImportFile = async (file, formatHint = null) => {
    let format = formatHint;
    let filename = '';
    
    // Extract filename if it's a File object
    if (file && typeof file === 'object' && file.name) {
        filename = file.name;
    }
    
    // Auto-detect format if not provided
    if (!format) {
        format = detectFileFormat(filename);
        if (!format) {
            throw new Error(`Unsupported file format: ${filename || 'unknown'}. Supported formats: .md, .markdown, .xlsx, .xls`);
        }
    }
    
    let rawParsedData;
    
    try {
        switch (format) {
            case 'md':
                rawParsedData = await readMarkdown(file);
                break;
            case 'xlsx':
                rawParsedData = await readExcel(file);
                break;
            default:
                throw new Error(`Unknown format: ${format}`);
        }
    } catch (error) {
        if (error.message.includes('Missing required') || 
            error.message.includes('No materials extracted') ||
            error.message.includes('Section')) {
            // Re-throw parsing errors as-is
            throw error;
        }
        throw new Error(`Failed to parse ${format.toUpperCase()} file: ${error.message}`);
    }
    
    // Normalize the output to ensure consistent shape
    return normalizeParsedData(rawParsedData);
};

export default parseImportFile;
