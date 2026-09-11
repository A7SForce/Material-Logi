/**
 * dataLayer.test.js — Test write/lock/reload persistence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import db from '../src/data/db.js';
import { createProject, getProjectById, deleteProject } from '../src/data/projectRepo.js';
import { createBomItem, getBomItemById, lockBomItemFields, updateBomItem } from '../src/data/bomRepo.js';

describe('Data Layer Agent - Persistence Tests', () => {
    let projectId;
    let itemId;
    
    beforeEach(async () => {
        // Clear tables before each test
        await db.projects.clear();
        await db.bomItems.clear();
        await db.changeLogEntries.clear();
        
        // Create a test project
        projectId = await createProject({ name: 'Test Project', location: 'Test Location' });
    });
    
    afterEach(async () => {
        // Clean up after tests
        if (projectId) {
            await deleteProject(projectId);
        }
    });
    
    it('should persist a BomItem with lockedFields', async () => {
        const bomItem = {
            projectId,
            item: 'Cement',
            spec: 'OPC 42.5',
            category: 'Structural',
            netQty: 100,
            wastagePct: 5,
            purchaseQty: 105,
            unitCost: 15.00,
            estTotal: 1575.00,
            basis: 'Standard mix',
            confidence: 1,
            notes: 'Test item',
            lockedFields: []
        };
        
        // Create the item
        itemId = await createBomItem(bomItem);
        
        // Verify it was created
        expect(itemId).toBeDefined();
        expect(typeof itemId).toBe('number');
        
        // Retrieve and verify
        const retrieved = await getBomItemById(itemId);
        expect(retrieved).toBeDefined();
        expect(retrieved.item).toBe('Cement');
        expect(retrieved.spec).toBe('OPC 42.5');
        expect(retrieved.netQty).toBe(100);
        expect(retrieved.purchaseQty).toBe(105);
        expect(retrieved.lockedFields).toEqual([]);
    });
    
    it('should persist lockedFields and respect them on update', async () => {
        // Create item without locks
        itemId = await createBomItem({
            projectId,
            item: 'Steel Bar',
            spec: '12mm TMT',
            category: 'Structural',
            netQty: 50,
            purchaseQty: 52,
            unitCost: 25.00,
            lockedFields: []
        });
        
        // Lock the purchaseQty field
        await lockBomItemFields(itemId, ['purchaseQty']);
        
        // Verify lock was persisted
        let item = await getBomItemById(itemId);
        expect(item.lockedFields).toContain('purchaseQty');
        
        // Try to update the locked field
        await updateBomItem(itemId, { purchaseQty: 999 }, item.lockedFields);
        
        // Verify the locked field was NOT updated
        item = await getBomItemById(itemId);
        expect(item.purchaseQty).toBe(52); // Should still be original value
        
        // But non-locked fields should update
        await updateBomItem(itemId, { unitCost: 30.00 }, item.lockedFields);
        item = await getBomItemById(itemId);
        expect(item.unitCost).toBe(30.00);
    });
    
    it('should survive database reopen (simulated by clear cache)', async () => {
        // Create item with locks
        itemId = await createBomItem({
            projectId,
            item: 'Sand',
            spec: 'River sand',
            category: 'Aggregate',
            netQty: 20,
            purchaseQty: 21,
            unitCost: 30.00,
            lockedFields: ['unitCost']
        });
        
        // Simulate "reopening" by getting fresh reference from DB
        // (In real IndexedDB this would happen automatically on app restart)
        const freshItem = await db.bomItems.get(itemId);
        
        expect(freshItem).toBeDefined();
        expect(freshItem.item).toBe('Sand');
        expect(freshItem.lockedFields).toContain('unitCost');
        expect(freshItem.unitCost).toBe(30.00);
    });
    
    it('should handle multiple locked fields', async () => {
        itemId = await createBomItem({
            projectId,
            item: 'Gravel',
            spec: '20mm',
            category: 'Aggregate',
            netQty: 30,
            purchaseQty: 32,
            unitCost: 20.00,
            estTotal: 640.00,
            lockedFields: []
        });
        
        // Lock multiple fields
        await lockBomItemFields(itemId, ['purchaseQty', 'unitCost', 'estTotal']);
        
        const item = await getBomItemById(itemId);
        expect(item.lockedFields.length).toBe(3);
        expect(item.lockedFields).toContain('purchaseQty');
        expect(item.lockedFields).toContain('unitCost');
        expect(item.lockedFields).toContain('estTotal');
    });
});
