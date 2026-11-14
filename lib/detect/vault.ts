import type { Finding, PIICategory } from './types';

const KNOWN_CATEGORIES: readonly PIICategory[] = [
  'AADHAAR',
  'PAN',
  'PHONE',
  'EMAIL',
  'UPI',
  'IFSC',
  'PASSPORT',
  'DOB',
  'ACCOUNT',
  'ADDRESS',
  'PERSON',
  'REDACTED',
];

const CATEGORY_PATTERN_GROUP = KNOWN_CATEGORIES.join('|');

/**
 * Normalizes a detected value so minor formatting variations (spaces, +91, hyphens, casing)
 * map to the same stable session token.
 */
export function normalizeIdentifierValue(category: PIICategory, raw: string): string {
  const trimmed = raw.trim();
  switch (category) {
    case 'AADHAAR':
      return trimmed.replace(/[\s-]/g, '');
    case 'PHONE': {
      const digits = trimmed.replace(/\D/g, '');
      return digits.length > 10 ? digits.slice(-10) : digits;
    }
    case 'PAN':
    case 'IFSC':
    case 'PASSPORT':
      return trimmed.replace(/\s+/g, '').toUpperCase();
    case 'ACCOUNT':
      return trimmed.replace(/\s+/g, '').toUpperCase();
    case 'EMAIL':
    case 'UPI':
      return trimmed.toLowerCase();
    case 'DOB':
    case 'PERSON':
    case 'ADDRESS':
    case 'REDACTED':
      return trimmed.replace(/\s+/g, ' ').toLowerCase();
  }
}

function formatToken(category: PIICategory, index: number): string {
  const padded = String(index).padStart(2, '0');
  return `[${category}_${padded}]`;
}

/**
 * In-memory only session vault mapping normalized identifiers to stable tokens ([PERSON_01], etc.)
 * and tokens back to original values for local rehydration.
 * Never persisted to localStorage, sessionStorage, cookies, or sent over the network.
 */
export class SessionVault {
  private readonly keyToToken = new Map<string, string>();
  private readonly tokenToValue = new Map<string, string>();
  private readonly categoryCounters = new Map<PIICategory, number>();

  register(category: PIICategory, rawValue: string): string {
    const normalized = `${category}:${normalizeIdentifierValue(category, rawValue)}`;
    const existing = this.keyToToken.get(normalized);
    if (existing) {
      return existing;
    }

    const nextIndex = (this.categoryCounters.get(category) ?? 0) + 1;
    this.categoryCounters.set(category, nextIndex);
    const token = formatToken(category, nextIndex);

    this.keyToToken.set(normalized, token);
    this.tokenToValue.set(token, rawValue);
    return token;
  }

  getValue(token: string): string | undefined {
    const direct = this.tokenToValue.get(token);
    if (direct !== undefined) return direct;

    // Normalize minor LLM token variations like [PERSON_1], [person_01], [ PERSON_01 ]
    const match = new RegExp(
      `^\\[?\\s*(${CATEGORY_PATTERN_GROUP})[_\\s-]*0*(\\d{1,3})\\s*\\]?$`,
      'i'
    ).exec(token.trim());
    if (!match) return undefined;

    const category = match[1]?.toUpperCase() as PIICategory | undefined;
    const num = Number(match[2]);
    if (!category || !Number.isFinite(num) || num <= 0) return undefined;

    return this.tokenToValue.get(formatToken(category, num));
  }

  hasToken(token: string): boolean {
    return this.getValue(token) !== undefined;
  }

  entries(): Array<{ token: string; value: string }> {
    return Array.from(this.tokenToValue.entries()).map(([token, value]) => ({
      token,
      value,
    }));
  }

  clear(): void {
    this.keyToToken.clear();
    this.tokenToValue.clear();
    this.categoryCounters.clear();
  }
}

/**
 * Applies redactions to text using the provided findings (non-overlapping).
 * Replaces from right to left so string offsets remain valid.
 */
export function redactText(text: string, findings: readonly Finding[]): string {
  if (findings.length === 0) return text;
  const sortedDesc = [...findings].sort((a, b) => b.start - a.start);
  let output = text;
  for (const finding of sortedDesc) {
    if (finding.start < 0 || finding.end > output.length || finding.start >= finding.end) {
      continue;
    }
    output = output.slice(0, finding.start) + finding.token + output.slice(finding.end);
  }
  return output;
}

/**
 * Restores redacted tokens in text using the local in-memory SessionVault.
 * Handles canonical [PERSON_01] as well as slightly mangled LLM outputs
 * (e.g. [PERSON_1], [person_01], [ PERSON_01 ], PERSON_01], [PERSON_01) without crashing.
 */
export function rehydrateText(text: string, vault: SessionVault): string {
  if (!text) return text;

  const tokenRegex = new RegExp(
    `\\[\\s*(${CATEGORY_PATTERN_GROUP})[_\\s-]*0*(\\d{1,3})\\s*\\]?|\\b(${CATEGORY_PATTERN_GROUP})_0*(\\d{1,3})\\]`,
    'gi'
  );

  return text.replace(tokenRegex, (fullMatch, cat1, num1, cat2, num2) => {
    const rawCat = (cat1 ?? cat2) as string | undefined;
    const rawNum = (num1 ?? num2) as string | undefined;
    if (!rawCat || !rawNum) return fullMatch;

    const category = rawCat.toUpperCase() as PIICategory;
    const index = Number(rawNum);
    if (!Number.isFinite(index) || index <= 0) return fullMatch;

    const canonical = formatToken(category, index);
    return vault.getValue(canonical) ?? fullMatch;
  });
}

/**
 * Strips any leaked vault values or placeholder tokens from text before external sharing (e.g. WhatsApp).
 */
export function scrubForSafeSharing(text: string, vault: SessionVault): string {
  let safe = text;
  for (const { value } of vault.entries()) {
    if (value.length >= 3) {
      safe = safe.split(value).join('[redacted]');
    }
  }
  const tokenRegex = new RegExp(
    `\\[\\s*(${CATEGORY_PATTERN_GROUP})[_\\s-]*0*(\\d{1,3})\\s*\\]`,
    'gi'
  );
  safe = safe.replace(tokenRegex, '[protected detail]');
  return safe;
}
