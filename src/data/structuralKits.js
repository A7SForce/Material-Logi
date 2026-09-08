/**
 * structuralKits.js — Manual Structural Kits (the "physics").
 * 
 * These kits encode engineering ratios, NOT learned patterns (Section 5.1).
 * Each kit defines:
 *   - driver: regex that activates the kit when matched against a BOM item
 *   - required: components that MUST be present, with qtyFormula
 *   - optional: nice-to-have components emitted as suggestions only
 * 
 * Config over code (Section 9.4): add new rows here, don't write if-branches.
 */

export const STRUCTURAL_KITS = [
    {
        id: 'partition',
        name: 'Standard Partition Kit',
        source: 'manual',
        driver: /gypsum|plaster board/i,
        required: [
            { sku: 'Metal Stud 75mm x 25mm x 8ft', qtyFormula: { per: 'driver', factor: 2.5 } },
            { sku: '1.5" Partition Screw (box)', qtyFormula: { per: 'driver', factor: 0.5 } },
            { sku: 'Joint Wall Tape 50mmx25m', qtyFormula: { per: 'driver', factor: 0.5 } },
            { sku: '18kg Flaxi Stopping (1 bag)', qtyFormula: { per: 'driver', factor: 0.25 } },
        ],
        optional: [
            { sku: 'C Channel 3x1.5in x 10ft', qtyFormula: { per: 'driver', factor: 1 } },
        ],
    },
    {
        id: 'conduit',
        name: 'PVC Conduit Kit',
        source: 'manual',
        driver: /pvc conduit pipe/i,
        dimensionFamily: /(pvc|conduit).*(pipe|elbow|tee|fitting|socket|bend)/i,
        required: [
            { sku: '3/4" PVC Elbow conduit', qtyFormula: { per: 'driver', factor: 0.5 } },
            { sku: '3/4" PVC Tee conduit', qtyFormula: { per: 'driver', factor: 0.25 } },
        ],
        optional: [],
    },
    {
        id: 'paint-site',
        name: 'Paint Site Kit',
        source: 'manual',
        driver: /maxilite emulsion paint/i,
        required: [
            { sku: 'Masking Tape 2" (single)', qtyFormula: { per: 'driver', factor: 1 } },
        ],
        optional: [
            { sku: 'ICI Maxilite Emulsion Paint (7L) White', qtyFormula: { per: 'driver', factor: 0.5 } },
        ],
    },
    {
        id: 'led-strip',
        name: 'Basic Lighting Kit',
        source: 'manual',
        driver: /led strip.*24v/i,
        required: [
            { sku: '1.5mm Cable Wire Red', qtyFormula: { per: 'driver', factor: 10 } },
            { sku: '1.5mm Cable Wire Black', qtyFormula: { per: 'driver', factor: 10 } },
            { sku: '13A socket type A', qtyFormula: { per: 'driver', factor: 0.5 } },
        ],
        optional: [
            { sku: '1G1W switch type A', qtyFormula: { per: 'driver', factor: 0.5 } },
        ],
    },
];

/**
 * Check if a BOM item triggers a kit and return the kit details
 * @param {object} item - BOM item with 'item' property
 * @returns {object|null} - Matching kit or null
 */
export const findMatchingKit = (item) => {
    if (!item || !item.item) return null;
    
    for (const kit of STRUCTURAL_KITS) {
        if (kit.driver.test(item.item)) {
            return kit;
        }
    }
    return null;
};

/**
 * Calculate required quantity for a kit component
 * @param {object} formula - { per: 'driver'|'area', factor: number } or { fixed: number }
 * @param {number} driverQty - Quantity of the driver material
 * @param {number} area - Area in sqft (if formula uses area)
 * @returns {number} - Calculated quantity
 */
export const calculateKitQty = (formula, driverQty, area = 0) => {
    if (formula.fixed !== undefined) {
        return formula.fixed;
    }
    
    if (formula.per === 'driver') {
        return Math.ceil(driverQty * formula.factor);
    }
    
    if (formula.per === 'area') {
        return Math.ceil(area * formula.factor);
    }
    
    return 0;
};
