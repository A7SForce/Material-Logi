/**
 * csvReader.test.js — Agent 1: header matching, rejection rows, tags, blanks.
 */
import { describe, it, expect } from 'vitest';
import { parseSupplierCsv } from '../src/utils/csvImport/csvReader.js';

describe('parseSupplierCsv', () => {
  it('matches columns by name regardless of order or case', () => {
    const { validRows, rejectedRows } = parseSupplierCsv(
      'ADDRESS,BusinessName,CONTACT\nBetong Rd,Acme,\"+6016-398 0328\"'
    );
    expect(rejectedRows).toEqual([]);
    expect(validRows).toHaveLength(1);
    expect(validRows[0]).toMatchObject({
      businessName: 'Acme',
      contact: '+6016-398 0328',
      address: 'Betong Rd',
      specialty: '',
      logisticsNote: '',
      sourceUrl: '',
    });
  });

  it('handles quoted commas and escaped quotes', () => {
    const { validRows } = parseSupplierCsv(
      'businessName,address\n"Acme, Sdn Bhd","No 24, Betong"\n"Quoted ""Name"" Ltd",X'
    );
    expect(validRows.map((r) => [r.businessName, r.address])).toEqual([
      ['Acme, Sdn Bhd', 'No 24, Betong'],
      ['Quoted "Name" Ltd', 'X'],
    ]);
  });

  it('splits tags on ";" and rejects blank business names with row numbers', () => {
    const { validRows, rejectedRows } = parseSupplierCsv(
      'businessName,tags,contact\nAcme,Hardware; Paint ,+6016\n,NoName,123\n   ,Spaces,456'
    );
    expect(validRows).toHaveLength(1);
    expect(validRows[0].tags).toEqual(['Hardware', 'Paint']);
    expect(rejectedRows).toEqual([
      { rowNumber: 3, reason: 'missing business name' },
      { rowNumber: 4, reason: 'missing business name' },
    ]);
  });

  it('rejects when the businessName column is missing entirely', () => {
    const { validRows, rejectedRows } = parseSupplierCsv('contact,address\n+6016,Betong');
    expect(validRows).toEqual([]);
    expect(rejectedRows).toEqual([{ rowNumber: 2, reason: 'missing business name' }]);
  });

  it('never emits null or literal "undefined" text', () => {
    const { validRows } = parseSupplierCsv('businessName,contact\nAcme,undefined');
    expect(validRows[0].contact).toBe('');
    expect(Object.values(validRows[0]).every((v) => v !== null && v !== 'undefined')).toBe(true);
  });
});
