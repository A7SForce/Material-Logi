/**
 * quickOrderGate.test.js — Fast Ordering eligibility (pure function, poGate-style).
 * Included: assigned items with no open item-referencing Confirm entries.
 * Excluded: items whose (item, spec) key matches an open entry's explicit ref.
 * agent_question rows carry no item ref, so they exclude nothing by themselves.
 */
import { describe, it, expect } from 'vitest';
import { eligibleOrderItems, confirmRefKeys } from '../src/logic/quickOrder.js';

const A = { id: 'a', item: 'Gypsum Board 9mm', spec: '4x8 sheet', assignedSupplierId: 's1' };
const B = { id: 'b', item: 'Metal Stud', spec: 'Frame', assignedSupplierId: 's1' };
const C = { id: 'c', item: 'Tape', spec: 'Roll', assignedSupplierId: 's2' };
const D = { id: 'd', item: 'Loose Screw', spec: null, assignedSupplierId: null };

describe('eligibleOrderItems', () => {
  it('includes everything with no open confirmations', () => {
    const { eligible, excluded } = eligibleOrderItems([A, B, C, D], 's1', []);
    expect(eligible.map((b) => b.id)).toEqual(['a', 'b']);
    expect(excluded).toEqual([]);
  });

  it('excludes items referenced by open pendings, counts them', () => {
    const open = [
      { kind: 'new_item_pending', refItem: 'Metal Stud', refSpec: 'Frame', resolved: false },
      { kind: 'removed_item_pending', refItem: 'metal  stud', refSpec: 'frame ', resolved: false },
    ];
    const { eligible, excluded } = eligibleOrderItems([A, B, C, D], 's1', open);
    expect(eligible.map((b) => b.id)).toEqual(['a']);
    expect(excluded.map((b) => b.id)).toEqual(['b']);
  });

  it('agent_question rows (no item ref) exclude nothing on their own', () => {
    const open = [{ kind: 'agent_question', issue: 'LED strip roll length?', resolved: false }];
    expect(confirmRefKeys(open).size).toBe(0);
    const { eligible, excluded } = eligibleOrderItems([A, B], 's1', open);
    expect(eligible).toHaveLength(2);
    expect(excluded).toHaveLength(0);
  });

  it('scopes strictly to the requested supplier', () => {
    const { eligible } = eligibleOrderItems([A, B, C, D], 's2', []);
    expect(eligible.map((b) => b.id)).toEqual(['c']);
  });
});
