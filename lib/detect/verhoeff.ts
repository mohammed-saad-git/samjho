const D_TABLE: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const P_TABLE: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const INV_TABLE: readonly number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function getTableValue(table: readonly (readonly number[])[], row: number, col: number): number {
  const r = table[row];
  if (!r) return 0;
  return r[col] ?? 0;
}

/**
 * Normalizes an Aadhaar string by removing spaces and hyphens.
 */
export function normalizeAadhaarDigits(input: string): string {
  return input.replace(/[\s-]/g, '');
}

/**
 * Validates a 12-digit Indian Aadhaar number:
 * - Must start with digits 2-9
 * - Must be exactly 12 digits (ignoring spaces/hyphens)
 * - Must satisfy the Verhoeff dihedral group D5 checksum
 */
export function validateVerhoeff(input: string): boolean {
  const digits = normalizeAadhaarDigits(input);
  if (!/^[2-9]\d{11}$/.test(digits)) {
    return false;
  }

  let c = 0;
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    const ch = digits.charCodeAt(len - 1 - i) - 48;
    const p = getTableValue(P_TABLE, i % 8, ch);
    c = getTableValue(D_TABLE, c, p);
  }

  return c === 0;
}

/**
 * Generates a valid 12-digit Aadhaar-format number from an 11-digit prefix starting with 2-9.
 */
export function generateVerhoeffChecksum(elevenDigits: string): string {
  const cleaned = normalizeAadhaarDigits(elevenDigits);
  if (!/^[2-9]\d{10}$/.test(cleaned)) {
    throw new Error('Expected 11 digits starting with 2-9 to generate Aadhaar checksum');
  }

  let c = 0;
  const len = cleaned.length;
  for (let i = 0; i < len; i++) {
    const ch = cleaned.charCodeAt(len - 1 - i) - 48;
    const p = getTableValue(P_TABLE, (i + 1) % 8, ch);
    c = getTableValue(D_TABLE, c, p);
  }

  const checkDigit = INV_TABLE[c] ?? 0;
  return `${cleaned}${checkDigit}`;
}
