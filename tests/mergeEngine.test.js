/**
 * mergeEngine.test.js — Test the three merge cases from the spec
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import db from '../src/data/db.js';
import { createProject, deleteProject } from '../src/data/projectRepo.js';
import { createBomItem, getBomItemsByProject, getBomItemById } from '../src/data/bomRepo.js';
import { getChangeLogByProject } from '../src/data/changeLogRepo.js';
import { mergeImport, lockFieldAndLog } from '../src/logic/mergeEngine.js';

describe('Merge Engine Agent - Three Specific Cases', () => {
    let projectId;
    
    beforeEach(async () => {
        // Clear all tables
        await db.projects.clear();
        await db.bomItems.clear();
        await db.shortageConfirmItems.clear();
        await db.changeLogEntries.clear();
        
        // Create test project
        projectId = await createProject({ name: 'Merge Test Project', location: 'Test' });
    });
    
    afterEach(async () => {
        if (projectId) {
            await deleteProject(projectId);
        }
    });
    
    /**
     * Case 1: Manually lock purchaseQty on one item, re-run merge with a new import 
     * that changes that same field → value must NOT change, and no ChangeLogEntry 
     * should claim it did.
     */
    it('Case 1: Locked field should not be overwritten by merge', async () => {
        // Create initial BOM item
        const itemId = await createBomItem({
            projectId,
            item: 'Cement',
            spec: 'OPC 42.5',
            category: 'Structural',
            netQty: 100,
            purchaseQty: 105,
            unitCost: 15.00,
            lockedFields: []
        });
        
        // Manually lock the purchaseQty field (simulating supervisor edit)
        await lockFieldAndLog(itemId, 'purchaseQty', 105, 110, projectId);
        
        // Verify lock was applied
        let item = await getBomItemById(itemId);
        expect(item.lockedFields).toContain('purchaseQty');
        expect(item.purchaseQty).toBe(105); // Original value before lock
        
        // Create a new import that tries to change purchaseQty
        const parsedImport = {
            projectTitle: 'Merge Test Project',
            bomItems: [{
                item: 'Cement',
                spec: 'OPC 42.5',
                category: 'Structural',
                netQty: 100,
                purchaseQty: 999, // Different value
                unitCost: 15.00
            }],
            shortageConfirmItems: [],
            supplierEntries: [],
            changeLogFromAgent: []
        };
        
        // Run merge
        const result = await mergeImport(projectId, parsedImport);
        
        // Verify purchaseQty was NOT changed
        item = await getBomItemById(itemId);
        expect(item.purchaseQty).toBe(105); // Should still be original locked value
        
        // Verify no changelog entry claims purchaseQty was changed by agent
        const changeLog = await getChangeLogByProject(projectId);
        const purchaseQtyChanges = changeLog.filter(entry => 
            entry.field === 'purchaseQty' && entry.actor === 'agent'
        );
        expect(purchaseQtyChanges.length).toBe(0);
    });
    
    /**
     * Case 2: Feed a new import with one item that doesn't exist in the old set → 
     * must appear as a new_item_pending ShortageConfirmItem, not silently added to BOM.
     */
    it('Case 2: New unmatched item should create new_item_pending ShortageConfirmItem', async () => {
        // Create initial BOM with one item
        await createBomItem({
            projectId,
            item: 'Cement',
            spec: 'OPC 42.5',
            category: 'Structural',
            netQty: 100,
            purchaseQty: 105,
            unitCost: 15.00,
            lockedFields: []
        });
        
        // Create a new import with an additional item that doesn't exist
        const parsedImport = {
            projectTitle: 'Merge Test Project',
            bomItems: [
                {
                    item: 'Cement',
                    spec: 'OPC 42.5',
                    category: 'Structural',
                    netQty: 100,
                    purchaseQty: 105,
                    unitCost: 15.00
                },
                {
                    item: 'NEW_STEEL_BAR',
                    spec: '16mm TMT',
                    category: 'Structural',
                    netQty: 30,
                    purchaseQty: 32,
                    unitCost: 35.00
                }
            ],
            shortageConfirmItems: [],
            supplierEntries: [],
            changeLogFromAgent: []
        };
        
        // Run merge
        const result = await mergeImport(projectId, parsedImport);
        
        // Verify the new item created a ShortageConfirmItem
        expect(result.shortageConfirmItems.length).toBeGreaterThan(0);
        
        const newPendingItem = result.shortageConfirmItems.find(
            sc => sc.kind === 'new_item_pending'
        );
        expect(newPendingItem).toBeDefined();
        expect(newPendingItem.referencedItemData.item).toBe('NEW_STEEL_BAR');
        
        // Verify the new item was NOT added to BOM yet
        const bomItems = await getBomItemsByProject(projectId);
        const steelInBom = bomItems.find(b => b.item === 'NEW_STEEL_BAR');
        expect(steelInBom).toBeUndefined();
    });
    
    /**
     * Case 3: Feed a new import missing an item that existed before → 
     * must appear as removed_item_pending, item must still exist in storage untouched.
     */
    it('Case 3: Missing item should create removed_item_pending, item stays in storage', async () => {
        // Create initial BOM with two items
        await createBomItem({
            projectId,
            item: 'Cement',
            spec: 'OPC 42.5',
            category: 'Structural',
            netQty: 100,
            purchaseQty: 105,
            unitCost: 15.00,
            lockedFields: []
        });
        
        await createBomItem({
            projectId,
            item: 'Sand',
            spec: 'River sand',
            category: 'Aggregate',
            netQty: 20,
            purchaseQty: 21,
            unitCost: 30.00,
            lockedFields: []
        });
        
        // Create a new import missing the Sand item
        const parsedImport = {
            projectTitle: 'Merge Test Project',
            bomItems: [
                {
                    item: 'Cement',
                    spec: 'OPC 42.5',
                    category: 'Structural',
                    netQty: 100,
                    purchaseQty: 105,
                    unitCost: 15.00
                }
                // Sand is intentionally missing
            ],
            shortageConfirmItems: [],
            supplierEntries: [],
            changeLogFromAgent: []
        };
        
        // Run merge
        const result = await mergeImport(projectId, parsedImport);
        
        // Verify a removed_item_pending was created
        const removedPendingItem = result.shortageConfirmItems.find(
            sc => sc.kind === 'removed_item_pending'
        );
        expect(removedPendingItem).toBeDefined();
        expect(removedPendingItem.referencedItemData.item).toBe('Sand');
        
        // Verify Sand still exists in storage untouched
        const bomItems = await getBomItemsByProject(projectId);
        const sandItem = bomItems.find(b => b.item === 'Sand');
        expect(sandItem).toBeDefined();
        expect(sandItem.netQty).toBe(20);
        expect(sandItem.purchaseQty).toBe(21);
    });
});
