/**
 * projectMatcher.test.js — Task N: re-quotes of one site match each other.
 * Parenthetical refs differ per export (S71354 vs Q260163) and are not the name,
 * so normalizeTitle strips them; matching then treats both as the same project.
 */
import { describe, it, expect } from 'vitest';
import { normalizeTitle } from '../src/logic/projectMatcher.js';

describe('normalizeTitle', () => {
  it('strips location tails and parenthetical refs to the bare name', () => {
    expect(normalizeTitle('KEDIAMAN PUAN HASHIMA, LORONG CAKERA PURNAMA, PUNCAK ALAM'))
      .toBe('KEDIAMAN PUAN HASHIMA');
    expect(normalizeTitle('KEDIAMAN PUAN HASHIMA (S71354)')).toBe('KEDIAMAN PUAN HASHIMA');
    expect(normalizeTitle('KEDIAMAN PUAN HASHIMA (Q260163)')).toBe('KEDIAMAN PUAN HASHIMA');
    expect(normalizeTitle('SURAU DARUL DAKWAH, BETONG, SARAWAK')).toBe('SURAU DARUL DAKWAH');
    expect(normalizeTitle('SURAU DARUL DAKWAH')).toBe('SURAU DARUL DAKWAH');
  });
});
