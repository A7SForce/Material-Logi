/**
 * poGate.test.js — Test PO blocked while confirmations open
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import db from '../src/data/db.js';
import { createProject, deleteProject } from '../src/data/projectRepo.js';
import { createBomItem } from '../src/data/bomRepo.js';

// Helper function to simulate the PO gate check
const checkPOGate = async (projectId) => {
    const shortageConfirmItems = await db.shortageConfirmItems
        .where('projectId')
        .equals(projectId)
        .filter(item => !item.resolved)
        .toArray();
    
    return {
        canAccessPO: shortageConfirmItems.length === 0,
        unresolvedCount: shortageConfirmItems.length,
        items: shortageConfirmItems
    };
};

describe('UI Screens Agent - PO Gate Test', () => {
    let projectId;
    
    beforeEach(async () => {
        // Clear all tables
        await db.projects.clear();
        await db.bomItems.clear();
        await db.shortageConfirmItems.clear();
        
        // Create test project
        projectId = await createProject({ name: 'PO Gate Test Project', location: 'Test' });
    });
    
    afterEach(async () => {
        if (projectId) {
            await deleteProject(projectId);
        }
    });
    
    it('should block PO access when there are unresolved ShortageConfirmItems', async () => {
        // Create a BOM item
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
        
        // Create an unresolved ShortageConfirmItem
        await db.shortageConfirmItems.add({
            projectId,
            severity: 'high',
            issue: 'Missing supplier confirmation',
            missingInfo: 'Need to verify supplier availability',
            confirmationRequired: 'Confirm supplier can deliver on time',
            owner: 'supervisor',
            resolved: false,
            kind: 'agent_question'
        });
        
        // Check PO gate
        const result = await checkPOGate(projectId);
        
        expect(result.canAccessPO).toBe(false);
        expect(result.unresolvedCount).toBe(1);
        expect(result.items.length).toBe(1);
    });
    
    it('should allow PO access when all ShortageConfirmItems are resolved', async () => {
        // Create a BOM item
        await createBomItem({
            projectId,
            item: 'Steel Bar',
            spec: '12mm TMT',
            category: 'Structural',
            netQty: 50,
            purchaseQty: 52,
            unitCost: 25.00,
            lockedFields: []
        });
        
        // Create a RESOLVED ShortageConfirmItem
        await db.shortageConfirmItems.add({
            projectId,
            severity: 'medium',
            issue: 'Quantity verification needed',
            missingInfo: 'Verify quantity with site team',
            confirmationRequired: 'Confirm final quantity',
            owner: 'supervisor',
            resolved: true, // This is resolved
            kind: 'agent_question'
        });
        
        // Check PO gate
        const result = await checkPOGate(projectId);
        
        expect(result.canAccessPO).toBe(true);
        expect(result.unresolvedCount).toBe(0);
    });
    
    it('should allow PO access when there are no ShortageConfirmItems at all', async () => {
        // Create a BOM item
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
        
        // No ShortageConfirmItems created
        
        // Check PO gate
        const result = await checkPOGate(projectId);
        
        expect(result.canAccessPO).toBe(true);
        expect(result.unresolvedCount).toBe(0);
    });
    
    it('should block PO when multiple types of ShortageConfirmItems exist', async () => {
        // Create BOM items
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
        
        // Create different kinds of unresolved ShortageConfirmItems
        await db.shortageConfirmItems.bulkAdd([
            {
                projectId,
                severity: 'high',
                issue: 'New item pending approval',
                missingInfo: 'New item not yet approved',
                confirmationRequired: 'Approve adding this new item',
                owner: 'supervisor',
                resolved: false,
                kind: 'new_item_pending'
            },
            {
                projectId,
                severity: 'medium',
                issue: 'Removed item needs confirmation',
                missingInfo: 'Item removed from import',
                confirmationRequired: 'Confirm removal',
                owner: 'supervisor',
                resolved: false,
                kind: 'removed_item_pending'
            },
            {
                projectId,
                severity: 'low',
                issue: 'Agent question',
                missingInfo: 'Additional info needed',
                confirmationRequired: 'Provide clarification',
                owner: 'supervisor',
                resolved: false,
                kind: 'agent_question'
            }
        ]);
        
        // Check PO gate
        const result = await checkPOGate(projectId);
        
        expect(result.canAccessPO).toBe(false);
        expect(result.unresolvedCount).toBe(3);
        
        // Verify all three kinds are present
        const kinds = result.items.map(i => i.kind);
        expect(kinds).toContain('new_item_pending');
        expect(kinds).toContain('removed_item_pending');
        expect(kinds).toContain('agent_question');
    });
});
