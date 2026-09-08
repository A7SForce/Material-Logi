/**
 * coverageRules.js — Coverage Math for Pre-Flight Validator (Section 5.2).
 * 
 * These are engineering-standard constants, NOT learned patterns.
 * Each rule defines:
 *   - keyword: regex to match material names
 *   - m2PerUnit: square meters covered per unit
 *   - unitHint: suggested unit for display
 * 
 * Config over code (Section 9.4): add new rows here, don't write if-branches.
 */

export const COVERAGE_RULES = [
    { keyword: /(emulsion|paint)/i, m2PerUnit: 12, unitHint: 'L' },
    { keyword: /(tile adhesive|adhesive for tile)/i, m2PerUnit: 3, unitHint: 'bag' },
    { keyword: /(tile grout|grout)/i, m2PerUnit: 8, unitHint: 'bag' },
    { keyword: /(joint compound|compound)/i, m2PerUnit: 8, unitHint: 'bag' },
    { keyword: /(waterproofing|water proof)/i, m2PerUnit: 10, unitHint: 'L' },
];

/**
 * Find coverage rule for a material
 * @param {string} name - Material name
 * @param {object} item - Full item object (for catalog override)
 * @returns {object|null} - Coverage rule or null
 */
export const findCoverageRule = (name, item = null) => {
    // Catalog-declared coverage always wins
    if (item && Number.isFinite(Number(item.coverage)) && Number(item.coverage) > 0) {
        return { m2PerUnit: Number(item.coverage), unitHint: item.unit || '', fromItem: true };
    }
    
    for (const rule of COVERAGE_RULES) {
        if (rule.keyword.test(name)) {
            return rule;
        }
    }
    return null;
};

/**
 * Calculate required quantity based on area and coverage rate
 * @param {number} area - Area in square meters
 * @param {number} m2PerUnit - Coverage per unit
 * @param {number} currentQty - Current quantity in BOM
 * @returns {object} - { required, missing, isOk }
 */
export const calculateCoverage = (area, m2PerUnit, currentQty) => {
    if (!area || area <= 0 || !m2PerUnit || m2PerUnit <= 0) {
        return { required: 0, missing: 0, isOk: true };
    }
    
    const required = Math.ceil(area / m2PerUnit);
    const missing = Math.max(0, required - (currentQty || 0));
    
    return {
        required,
        missing,
        isOk: (currentQty || 0) >= required,
    };
};

/**
 * Validate BOM against coverage rules
 * @param {Array} bomItems - Array of BOM items
 * @param {number} projectArea - Total project area (if known)
 * @returns {Array} - Array of validation errors/warnings
 */
export const validateCoverage = (bomItems, projectArea = 0) => {
    const errors = [];
    
    for (const item of bomItems) {
        const rule = findCoverageRule(item.item, item);
        if (!rule) continue;
        
        // Use project area if provided, otherwise estimate from item context
        const area = projectArea > 0 ? projectArea : (item.coverage_sqft || 0);
        
        if (area > 0) {
            const result = calculateCoverage(area, rule.m2PerUnit, item.quantity);
            
            if (!result.isOk && result.missing > 0) {
                errors.push({
                    itemId: item.id,
                    item: item.item,
                    type: 'COVERAGE_INSUFFICIENT',
                    message: `${item.item}: ${area} m² ÷ ${rule.m2PerUnit} m²/${rule.unitHint} = ${result.required} ${rule.unitHint}, BOM has ${item.quantity}. Need ${result.missing} more.`,
                    required: result.required,
                    current: item.quantity,
                    missing: result.missing,
                });
            }
        }
    }
    
    return errors;
};
