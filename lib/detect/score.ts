import { detectPatternMatches } from './patterns.ts';
import { detectNames } from './names.ts';
import type {
  CandidateMatch,
  CategoryScoreDetail,
  PIICategory,
  PrivacyScoreReport,
} from './types.ts';

interface CategoryWeightConfig {
  weight: number;
  cap: number;
}

const CATEGORY_WEIGHTS: Record<PIICategory, CategoryWeightConfig> = {
  AADHAAR: { weight: 16, cap: 22 },
  PAN: { weight: 14, cap: 18 },
  PASSPORT: { weight: 14, cap: 18 },
  PHONE: { weight: 10, cap: 15 },
  ACCOUNT: { weight: 10, cap: 15 },
  DOB: { weight: 9, cap: 12 },
  UPI: { weight: 9, cap: 12 },
  ADDRESS: { weight: 8, cap: 12 },
  EMAIL: { weight: 8, cap: 12 },
  PERSON: { weight: 7, cap: 12 },
  IFSC: { weight: 5, cap: 8 },
  REDACTED: { weight: 7, cap: 12 },
};

const SEVERITY_RANK = {
  high: 3,
  medium: 2,
  low: 1,
} as const;

const CATEGORY_TIE_ORDER: Record<PIICategory, number> = {
  AADHAAR: 1,
  PAN: 2,
  PASSPORT: 3,
  DOB: 4,
  ACCOUNT: 5,
  PHONE: 6,
  UPI: 7,
  EMAIL: 8,
  ADDRESS: 9,
  PERSON: 10,
  IFSC: 11,
  REDACTED: 12,
};

/**
 * Resolves overlapping candidate matches:
 * 1) Longest span wins
 * 2) Highest severity wins
 * 3) Highest confidence wins
 * 4) Deterministic category order
 */
export function resolveOverlaps(candidates: readonly CandidateMatch[]): CandidateMatch[] {
  const sorted = [...candidates].sort((a, b) => {
    const lenDiff = b.end - b.start - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;

    const sevDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sevDiff !== 0) return sevDiff;

    const confDiff = b.confidence - a.confidence;
    if (confDiff !== 0) return confDiff;

    const catDiff = CATEGORY_TIE_ORDER[a.category] - CATEGORY_TIE_ORDER[b.category];
    if (catDiff !== 0) return catDiff;

    return a.start - b.start;
  });

  const accepted: CandidateMatch[] = [];
  for (const candidate of sorted) {
    if (candidate.start >= candidate.end) continue;
    const overlaps = accepted.some(
      (existing) => candidate.start < existing.end && candidate.end > existing.start
    );
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  return accepted.sort((a, b) => a.start - b.start);
}

/**
 * Counts remaining quasi-identifiers (monetary amounts and non-DOB dates) that are intentionally
 * preserved for document meaning, contributing a small residual risk deduction.
 */
function countResidualQuasiIdentifiers(text: string): number {
  const amounts = text.match(/(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d{1,2})?/gi) ?? [];
  const slashDates =
    text.match(
      /\b\d{1,2}[\/\-](?:\d{1,2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\/\-]\d{2,4}\b/gi
    ) ?? [];
  const textDates =
    text.match(
      /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/gi
    ) ?? [];
  return amounts.length + slashDates.length + textDates.length;
}

/**
 * Computes a deterministic privacy score (0-100) directly from the given text.
 * Running the exact same function on original text and redacted text yields e.g. 22 -> 94.
 */
export function computePrivacyScore(text: string): PrivacyScoreReport {
  if (!text.trim()) {
    return {
      score: 100,
      totalDeduction: 0,
      quasiIdentifierPenalty: 0,
      breakdown: [],
    };
  }

  const rawCandidates = [...detectPatternMatches(text), ...detectNames(text)];
  const resolved = resolveOverlaps(rawCandidates);

  const counts = new Map<PIICategory, number>();
  for (const item of resolved) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }

  const breakdown: CategoryScoreDetail[] = [];
  let identifierDeduction = 0;

  for (const [category, count] of counts.entries()) {
    const config = CATEGORY_WEIGHTS[category];
    const deduction = Math.min(config.cap, count * config.weight);
    identifierDeduction += deduction;
    breakdown.push({
      category,
      count,
      deduction,
      cap: config.cap,
    });
  }

  breakdown.sort((a, b) => b.deduction - a.deduction);

  const quasiCount = countResidualQuasiIdentifiers(text);
  const quasiIdentifierPenalty = Math.min(6, Math.round(quasiCount * 0.8));

  const totalDeduction = identifierDeduction + quasiIdentifierPenalty;
  const score = Math.max(0, Math.min(100, 100 - totalDeduction));

  return {
    score,
    totalDeduction,
    quasiIdentifierPenalty,
    breakdown,
  };
}
