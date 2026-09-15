/**
 * quickOrderMessage.test.js — Fast Ordering message template, exact bytes.
 * Any template drift fails loudly (same convention as the PDF byte tests).
 */
import { describe, it, expect } from 'vitest';
import { buildQuickOrderMessage } from '../src/logic/quickOrder.js';

describe('buildQuickOrderMessage', () => {
  it('renders the exact template without a note', () => {
    expect(buildQuickOrderMessage({
      projectName: 'SURAU DARUL DAKWAH',
      supplierName: 'New Eastern Trading',
      lines: [
        { item: 'Gypsum Board 9mm', spec: '4x8 sheet', purchaseQty: 12, unit: 'pcs' },
        { item: 'Metal Stud', spec: 'Frame', purchaseQty: 96, unit: 'pcs' },
      ],
      note: '',
    })).toBe(
      'Order — SURAU DARUL DAKWAH\n' +
      'Supplier: New Eastern Trading\n' +
      '\n' +
      '1. Gypsum Board 9mm — 4x8 sheet — 12 pcs\n' +
      '2. Metal Stud — Frame — 96 pcs\n' +
      '\n' +
      'Please confirm availability & delivery date. Thank you.'
    );
  });

  it('appends the R3 note as a final line when filled', () => {
    expect(buildQuickOrderMessage({
      projectName: 'P',
      supplierName: 'S',
      lines: [{ item: 'Tape', spec: null, purchaseQty: 6, unit: 'roll' }],
      note: 'need by Friday',
    })).toBe(
      'Order — P\n' +
      'Supplier: S\n' +
      '\n' +
      '1. Tape — - — 6 roll\n' +
      '\n' +
      'Please confirm availability & delivery date. Thank you.\n' +
      'Note: need by Friday'
    );
  });
});
