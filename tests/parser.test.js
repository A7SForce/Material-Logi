/**
 * parser.test.js — Test that both sample files produce identical ParsedImport shape
 */

import { describe, it, expect } from 'vitest';
import { parseImportFile } from '../src/utils/importParser/detectFormat.js';

// Mock markdown content representing the Surau Darul Dakwah project
const mockMarkdownContent = `# SURAU DARUL DAKWAH

## BOM - Bill of Materials

| Item | Spec | Category | Unit | Net Qty | Wastage % | Purchase Qty | Unit Cost | Total | Basis | Confidence | Pack | Notes |
|------|------|----------|------|---------|-----------|--------------|-----------|-------|-------|------------|------|-------|
| Cement | OPC 42.5 | Structural | bag | 100 | 5 | 105 | 15.00 | 1575.00 | Standard mix | 1 | null | Primary binder |
| Steel Bar | 12mm TMT | Structural | pcs | 50 | 3 | 52 | 25.00 | 1300.00 | Reinforcement | 1 | null | Main reinforcement |
| Sand | River sand | Aggregate | ton | 20 | 2 | 21 | 30.00 | 630.00 | Concrete mix | 1 | null | Fine aggregate |

## Shortage / Confirm Items

- **medium**: Missing supplier contact for cement
- **high**: Need confirmation on steel bar quantity

## Suppliers

- ABC Hardware; John Doe; Kuala Lumpur; Building materials
- XYZ Supplies; Jane Smith; Selangor; Steel products

## Change Log

- Initial import from Excel
- Updated quantities based on site visit
`;

describe('Parser Agent - Parser Tests', () => {
    it('should parse markdown content correctly', async () => {
        const result = await parseImportFile({ content: mockMarkdownContent }, 'md');
        
        // Check structure
        expect(result).toHaveProperty('projectTitle');
        expect(result).toHaveProperty('bomItems');
        expect(result).toHaveProperty('shortageConfirmItems');
        expect(result).toHaveProperty('supplierEntries');
        expect(result).toHaveProperty('changeLogFromAgent');
        
        // Check project title
        expect(result.projectTitle).toBe('SURAU DARUL DAKWAH');
        
        // Check BOM items count
        expect(result.bomItems.length).toBe(3);
        
        // Check first BOM item structure
        const firstItem = result.bomItems[0];
        expect(firstItem).toHaveProperty('item');
        expect(firstItem).toHaveProperty('spec');
        expect(firstItem).toHaveProperty('category');
        expect(firstItem).toHaveProperty('unit');
        expect(firstItem).toHaveProperty('netQty');
        expect(firstItem).toHaveProperty('wastagePct');
        expect(firstItem).toHaveProperty('purchaseQty');
        expect(firstItem).toHaveProperty('unitCost');
        expect(firstItem).toHaveProperty('estTotal');
        expect(firstItem).toHaveProperty('basis');
        expect(firstItem).toHaveProperty('confidence');
        expect(firstItem).toHaveProperty('pack');
        expect(firstItem).toHaveProperty('notes');
        
        // Check values
        expect(firstItem.item).toBe('Cement');
        expect(firstItem.spec).toBe('OPC 42.5');
        expect(firstItem.category).toBe('Structural');
        expect(firstItem.netQty).toBe(100);
        expect(firstItem.unitCost).toBe(15.00);
        
        // Check shortage items
        expect(result.shortageConfirmItems.length).toBeGreaterThan(0);
        
        // Check suppliers
        expect(result.supplierEntries.length).toBeGreaterThan(0);
        
        // Check changelog
        expect(result.changeLogFromAgent.length).toBeGreaterThan(0);
    });
    
    it('should handle empty sections gracefully', async () => {
        const minimalMarkdown = `# Test Project

## BOM

| Item | Qty |
|------|-----|
| Test Item | 10 |
`;
        
        const result = await parseImportFile({ content: minimalMarkdown }, 'md');
        
        expect(result.projectTitle).toBe('Test Project');
        expect(result.bomItems.length).toBe(1);
        expect(result.bomItems[0].item).toBe('Test Item');
        expect(result.bomItems[0].netQty).toBe(10);
        
        // Empty sections should be empty arrays, not undefined
        expect(result.shortageConfirmItems).toEqual([]);
        expect(result.supplierEntries).toEqual([]);
        expect(result.changeLogFromAgent).toEqual([]);
    });
    
    it('should normalize missing fields to null or defaults', async () => {
        const sparseMarkdown = `# Sparse Project

## BOM

| Item |
|------|
| Minimal Item |
`;
        
        const result = await parseImportFile({ content: sparseMarkdown }, 'md');
        
        expect(result.bomItems.length).toBe(1);
        const item = result.bomItems[0];
        
        // Should have defaults
        expect(item.unit).toBe('pcs');
        expect(item.netQty).toBe(0);
        expect(item.wastagePct).toBe(0);
        expect(item.purchaseQty).toBe(0);
        expect(item.confidence).toBe(1);
        
        // Missing optional fields should be null
        expect(item.spec).toBe(null);
        expect(item.category).toBe(null);
    });
});
