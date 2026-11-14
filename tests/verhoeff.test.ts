import { describe, expect, it } from 'vitest';
import {
  generateVerhoeffChecksum,
  normalizeAadhaarDigits,
  validateVerhoeff,
} from '../lib/detect/verhoeff';

describe('Verhoeff checksum for Aadhaar numbers', () => {
  it('validates generated 12-digit Aadhaar numbers with and without spaces/hyphens', () => {
    const valid = generateVerhoeffChecksum('49287163504');
    expect(valid).toHaveLength(12);
    expect(validateVerhoeff(valid)).toBe(true);

    const spaced = `${valid.slice(0, 4)} ${valid.slice(4, 8)} ${valid.slice(8, 12)}`;
    const hyphenated = `${valid.slice(0, 4)}-${valid.slice(4, 8)}-${valid.slice(8, 12)}`;
    expect(validateVerhoeff(spaced)).toBe(true);
    expect(validateVerhoeff(hyphenated)).toBe(true);
  });

  it('rejects any single-digit alteration or adjacent transposition', () => {
    const valid = generateVerhoeffChecksum('63819245710');
    expect(validateVerhoeff(valid)).toBe(true);

    // Flip last digit
    const badLast = `${valid.slice(0, 11)}${(Number(valid[11]) + 1) % 10}`;
    expect(validateVerhoeff(badLast)).toBe(false);

    // Flip middle digit
    const midDigit = (Number(valid[5]) + 3) % 10;
    const badMid = `${valid.slice(0, 5)}${midDigit}${valid.slice(6)}`;
    expect(validateVerhoeff(badMid)).toBe(false);

    // Adjacent transposition of digits 3 and 4
    const transposed = `${valid.slice(0, 3)}${valid[4]}${valid[3]}${valid.slice(5)}`;
    if (transposed !== valid) {
      expect(validateVerhoeff(transposed)).toBe(false);
    }
  });

  it('rejects numbers starting with 0 or 1 or wrong lengths', () => {
    expect(validateVerhoeff('012345678901')).toBe(false);
    expect(validateVerhoeff('123456789012')).toBe(false);
    expect(validateVerhoeff('23456789012')).toBe(false); // 11 digits
    expect(validateVerhoeff('2345678901234')).toBe(false); // 13 digits
    expect(validateVerhoeff('abcd56789012')).toBe(false);
  });

  it('normalizes spaces and hyphens properly', () => {
    expect(normalizeAadhaarDigits('4928 7163-5042')).toBe('492871635042');
  });
});
