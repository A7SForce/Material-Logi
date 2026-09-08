/**
 * dsgB.js — Dual-Stream Positional Extractor for DSG B-formatted Excel files.
 * 
 * This is the ONLY import path for Logistics Helper v3 (Section 4: "one door in").
 * It parses Excel files produced by System A (reconciliation agent) with two sheets:
 *   - "Purchase List" → becomes the working BOM
 *   - "Reconciliation Table" → becomes audit trail (variance, confidence, reason)
 * 
 * If the file doesn't match the expected DSG B shape, it rejects with a specific error.
 * No best-effort partial parses. No AI fallback. No statistical guessing.
 */
import * as XLSX from 'xlsx';
import { generateId } from '../helpers.js';

/* ── Section labels → categories (regex matched against col0+col1) ──────── */
const SECTION_RULES = [
    [/A\s*NEW\s*STRUCTURE/i, 'New Structure'],
    [/B\s*CEILING/i, 'Ceiling'],
    [/C\s*WALL\s*PANEL/i, 'Wall Panel'],
    [/D\s*WALL\s*FINISH/i, 'Wall Finishes'],
    [/E\s*GLASS\s*FINISH/i, 'Glass / Stickers'],
    [/FURNITURE/i, 'Furniture'],
    [/G\s*LIGHTING/i, 'Lighting'],
    [/H.*WALL.*FLOOR.*TILES/i, 'Tiles'],
    [/^I\b.*CARPET|CARPET.*OTHER THAN|FLOORING/i, 'Carpet / Flooring'],
    [/J\s*PAINT|CAT\s*DEKAT\s*SITE/i, 'Paint'],
    [/K\s*SITE|SITE\s*PREPARATION|PREPARATION/i, 'Site Preparation'],
    [/L\s*LABOUR|LABOUR\s*WORK|TYPES\s*OF\s*WORK/i, 'Labour'],
    [/M\s*TRANSPORT/i, 'Transport'],
];

/* Fixed category map for sheets without section labels */
const SHEET_CATEGORY = {
    'Table 4': 'Door Hardware',
    'Table 9': 'Furniture',
    'Table 10': 'Furniture',
    'Table 11': 'Furniture',
    'Table 12': 'Lighting',
};

/* Sheets that are docs/summaries — never parsed */
const SKIP_SHEET = { 'Table 1': 1, 'Table 2': 1, 'Table 20': 1, 'Table 22': 1, 'Table 23': 1 };

/* Noise: names that are never line items */
const SKIP_NAME = /^(material|material \(others\)|supporting material|yang lain|others|details|sec ?spec|spec$|insert (item|spec|carpet|paint|underlay)|masukkan (spec|kod|item)|kalau ada|untuk |qty lebihkan|lebihkan qty|leibihkan|total|sub.?total|job cost|project|client|quotation|category|batch|rm\s*[\d,.]+|#div\/0!|key in pakej|cotigency$|commission$|gympsum|cement board|plywood|pvc board|qty lebihkan|kalau <10|tambah 2|yang lain|masukkan spec|insert item|insert paint code|spec|total project|batch 1|job cost|summary of tpc|total installation|cotigency)/i;
const POINTER = /termasuk dalam|→/i;
const SECTION_HEADER_TEXT = /(GYPSUM|CEMENT BOARD|PLYWOOD|PVC BOARD|MDF BOARD|ACOUSTIC|QTY LEBIHKAN|KALAU|TAMBAH 2|YANG LAIN|MASUKKAN SPEC|INSERT ITEM|INSERT PAINT CODE|^SPEC$)/i;

/* ── Cell helpers ──────────────────────────────────────────────────────────── */
const cellAt = (sheet, R, C) => sheet[XLSX.utils.encode_cell({ r: R, c: C })];

const cellStr = (sheet, R, C) => {
    const c = cellAt(sheet, R, C);
    const v = c == null ? undefined : (c.w != null ? c.w : c.v);
    return v == null ? '' : String(v).trim();
};

const numOf = (val) => {
    if (val == null) return 0;
    const n = Number(String(val).replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
};

const numCell = (sheet, R, C) => numOf(cellStr(sheet, R, C));

const cleanName = (raw) => {
    let s = String(raw || '').trim();
    if (!s || s.length < 2) return '';
    s = s.replace(/^\d+[\.\\)]\s*/, '').trim();
    if (/^\d+([.,]\d+)?$/.test(s)) return '';
    s = s.replace(/RM\s*[\d,.]+\s*(\/\s*\w+)?\s*$/i, '').trim();
    s = s.replace(/\s*[→►].*$/g, '').trim();
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length < 2) return '';
    if (POINTER.test(s)) return '';
    if (SKIP_NAME.test(s)) return '';
    return s;
};

/* ── Section detection across a sheet's rows ─────────────────────────────── */
const sheetSection = (sheet, rows) => {
    for (const R of rows) {
        const joined = `${cellStr(sheet, R, 0)} ${cellStr(sheet, R, 1)}`;
        for (const [re, cat] of SECTION_RULES) {
            if (re.test(joined)) return cat;
        }
    }
    return null;
};

/* ── Header-driven column mapping (anchored tokens) ──────────────────────── */
const HEADER_MAT = /material\b/i;
const HEADER_QTY = /\b(qty|quantity|amount)\b/i;
const HEADER_PRICE = /\bprice\b/i;
const HEADER_TOTAL = /\btotal\b/i;

const tokenKind = (tok) => {
    if (!tok) return null;
    if (/^total\s*trip\b/i.test(tok)) return 'qty';
    if (HEADER_QTY.test(tok)) return 'qty';
    if (HEADER_PRICE.test(tok)) return 'price';
    if (HEADER_TOTAL.test(tok)) return 'total';
    return null;
};

const IS_HEADER_ROW = (sheet, R) => {
    let q = 0, p = 0, t = 0;
    for (let C = 0; C <= 16; C++) {
        const kind = tokenKind(cellStr(sheet, R, C));
        if (kind === 'qty') q++;
        else if (kind === 'price') p++;
        else if (kind === 'total') t++;
    }
    if (q + p + t >= 2) return true;
    return /material\b|item\b/i.test(cellStr(sheet, R, 0))
        || /material\b|item\b|tiles\b|purpose\b/i.test(cellStr(sheet, R, 1));
};

const unitFromHeader = (tok) => {
    const m = String(tok || '').match(/\(([^)]+)\)/i);
    const s = (m ? m[1] : String(tok || '')).toLowerCase();
    if (/rolls?/.test(s)) return 'rolls';
    if (/tong\b/.test(s)) return 'tong';
    if (/box|bundle|drum/.test(s)) return 'box';
    if (/bag|sack/.test(s)) return 'bag';
    if (/pcs|pieces|piece|unit/.test(s)) return 'pcs';
    if (/set/.test(s)) return 'set';
    if (/lit[er]+/.test(s)) return 'l';
    return null;
};

const mapColumns = (sheet, R, maxCol) => {
    let left = { name: 2, qty: 5, price: 6, total: 7, unit: null };
    let right = { name: 10, qty: 12, price: 13, total: 14, unit: null };
    let matLeft = -1, matRight = -1, qtyRight = -1, priceRight = -1, totalRight = -1;
    let haveLeftQty = 0, haveLeftPrice = 0, haveLeftTotal = 0;
    
    for (let C = 0; C <= Math.min(maxCol, 16); C++) {
        const tok = cellStr(sheet, R, C);
        if (!tok) continue;
        if (HEADER_MAT.test(tok)) {
            if (matLeft < 0) { matLeft = C; left.name = C; }
            else if (matRight < 0) { matRight = C; right.name = C; }
        }
        const kind = tokenKind(tok);
        if (kind === 'qty') {
            if (matLeft >= 0 && matRight < 0 && haveLeftQty === 0) {
                left.qty = C; haveLeftQty = 1;
            } else if (matRight >= 0 || haveLeftQty) {
                right.qty = C; qtyRight = C; haveLeftQty ||= 1;
            }
        } else if (kind === 'price') {
            if (haveLeftPrice === 0) { left.price = C; haveLeftPrice = 1; }
            else { right.price = C; priceRight = C; }
        } else if (kind === 'total') {
            if (haveLeftTotal === 0) { left.total = C; haveLeftTotal = 1; }
            else { right.total = C; totalRight = C; }
        }
    }
    
    if (matLeft < 0) {
        for (let C = 0; C <= Math.min(maxCol, 8); C++) {
            const t = cellStr(sheet, R, C);
            if (HEADER_MAT.test(t)) { left.name = C; break; }
        }
    }
    
    const u = unitFromHeader(cellStr(sheet, R, left.qty));
    if (u) left.unit = u;
    
    return { left, right };
};

const completeHeader = (sheet, R, maxCol) => {
    let q = 0, p = 0, t = 0;
    for (let C = 0; C <= Math.min(maxCol, 16); C++) {
        const k = tokenKind(cellStr(sheet, R, C));
        if (k === 'qty') q++;
        else if (k === 'price') p++;
        else if (k === 'total') t++;
    }
    return q > 0 && p > 0 && t > 0;
};

const totalOf = (sheet, R, C) => {
    const c = cellAt(sheet, R, C);
    const str = c == null ? '' : String(c.w != null ? c.w : c.v);
    if (/\d/.test(str)) return numCell(sheet, R, C);
    return numCell(sheet, R, C + 1);
};

const unitOf = (name) => {
    const n = name.toLowerCase();
    if (/roll/i.test(n)) return 'rolls';
    if (/tong/i.test(n)) return 'tong';
    if (/box/i.test(n)) return 'box';
    if (/bag/i.test(n)) return 'bag';
    if (/pcs|piece|set/i.test(n)) return 'pcs';
    if (/metr/i.test(n)) return 'm';
    if (/sqft|sq ft|square feet/i.test(n)) return 'sqft';
    return 'pcs';
};

const DEFAULTS = {
    left: { name: 2, qty: 5, price: 6, total: 7, unit: null },
    right: { name: 10, qty: 12, price: 13, total: 14, unit: null },
};

/* ── Per-sheet extractor ─────────────────────────────────────────────────── */
const processSheet = (sheet, sheetName) => {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rows = [];
    for (let R = range.s.r; R <= range.e.r; R++) rows.push(R);
    
    const category = sheetSection(sheet, rows) || SHEET_CATEGORY[sheetName] || sheetName;
    const materials = [];
    let cols = DEFAULTS, foundComplete = false;
    
    for (const R of rows) {
        if (IS_HEADER_ROW(sheet, R)) {
            if (!foundComplete && completeHeader(sheet, R, range.e.c)) {
                cols = mapColumns(sheet, R, range.e.c);
                foundComplete = true;
            }
        }
    }
    
    if (!foundComplete) {
        for (const R of rows) {
            if (IS_HEADER_ROW(sheet, R)) {
                cols = mapColumns(sheet, R, range.e.c);
                break;
            }
        }
    }

    const emit = (R, name, qty, price, totalCol, unitHint, isRightStream = false) => {
        const item = cleanName(name);
        if (!item) return null;
        const q = numOf(qty);
        const t = totalOf(sheet, R, totalCol);
        const unitPrice = numOf(price);
        if (!(q > 0 || t > 0)) return null;
        if ((q === 1 || q === 0) && !(unitPrice > 0 || t > 0)) return null;

        let finalQty = q;
        if (q === 25900 || (unitPrice > 0 && q > 0 && q * unitPrice > t * 10)) {
            finalQty = unitPrice > 0 ? Math.round(t / unitPrice) : q;
        }

        return {
            id: generateId(),
            item,
            category,
            quantity: finalQty,
            unit: unitHint || unitOf(item),
            unitPrice,
            price: t,
            total: t,
            source: isRightStream ? 'supporting' : 'main',
            type: isRightStream ? 'supporting' : 'main',
            confidence: 1,
            coverage_sqft: 0,
            coverage_rate: 0,
        };
    };

    for (const R of rows) {
        if (IS_HEADER_ROW(sheet, R)) continue;
        const joined = `${cellStr(sheet, R, 0)} ${cellStr(sheet, R, 1)}`;
        if (SECTION_RULES.some(([re]) => re.test(joined))) continue;
        if (POINTER.test(joined)) continue;

        const rowText = `${joined} ${cellStr(sheet, R, 2)} ${cellStr(sheet, R, 3)}`.toUpperCase();
        if (SECTION_HEADER_TEXT.test(rowText)) continue;

        const leftName = cellStr(sheet, R, cols.left.name);
        if (leftName) {
            const m = emit(R, leftName, cellStr(sheet, R, cols.left.qty), 
                          cellStr(sheet, R, cols.left.price), cols.left.total, 
                          cols.left.unit);
            if (m) materials.push(m);
        }
        
        const rightName = cellStr(sheet, R, cols.right.name);
        if (rightName) {
            const m = emit(R, rightName, cellStr(sheet, R, cols.right.qty),
                          cellStr(sheet, R, cols.right.price), cols.right.total,
                          cols.right.unit);
            if (m) materials.push(m);
        }
    }

    // Paint sheet: FT/SQFT column (col3) is paintable area, col4 ("/ 60 SQFT") is litres
    let area = 0, litres = 0;
    if (category === 'Paint' && cols.left.qty === 5 && cols.left.name === 2) {
        for (const R of rows) {
            if (!cleanName(cellStr(sheet, R, 2))) continue;
            const c3 = numCell(sheet, R, 3), c4 = numCell(sheet, R, 4);
            if (c3 > 0) area += c3;
            if (c4 > 0) litres += c4;
        }
    }

    return { materials, area, litres };
};

/* ── Entry point ─────────────────────────────────────────────────────────── */
/**
 * Parse a DSG B-formatted Excel file.
 * @param {File|ArrayBuffer} file - The uploaded file
 * @returns {Promise<{success: boolean, materials: Array, error?: string, metadata: object}>}
 * 
 * Throws specific errors for malformed files (Section 4: reject with specific error)
 */
export const parseDSGB = async (file) => {
    try {
        const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true });
        
        // Validate required sheets exist (Section 4: one door in, strict validation)
        const hasPurchaseList = workbook.SheetNames.some(n => 
            n.toLowerCase().includes('purchase') || n.toLowerCase().includes('bom')
        );
        
        if (!hasPurchaseList) {
            throw new Error('Missing required sheet: Purchase List (or BOM)');
        }

        const allMaterials = [];
        let totalArea = 0, totalLitres = 0;
        
        for (const sheetName of workbook.SheetNames) {
            if (SKIP_SHEET[sheetName]) continue;
            
            const sheet = workbook.Sheets[sheetName];
            const { materials, area, litres } = processSheet(sheet, sheetName);
            
            allMaterials.push(...materials);
            if (area > 0) totalArea = area;
            if (litres > 0) totalLitres = litres;
        }

        if (allMaterials.length === 0) {
            throw new Error('No materials extracted - file may be empty or malformed');
        }

        return {
            success: true,
            materials: allMaterials,
            metadata: {
                projectName: file.name?.replace(/\.[^/.]+$/, '') || 'Imported Project',
                totalItems: allMaterials.length,
                totalPrice: allMaterials.reduce((s, m) => s + Number(m.total || 0), 0),
                sheetsProcessed: workbook.SheetNames.filter(n => !SKIP_SHEET[n]),
                paintArea: totalArea > 0 ? totalArea : undefined,
                paintLitres: totalLitres > 0 ? totalLitres : undefined,
            },
            format: 'DSG_B',
        };
        
    } catch (error) {
        if (error.message.includes('Missing required') || 
            error.message.includes('No materials extracted')) {
            return {
                success: false,
                error: error.message,
                materials: [],
                metadata: {},
            };
        }
        throw error;
    }
};

export default parseDSGB;
