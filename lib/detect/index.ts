import { detectNames } from './names';
import { detectPatternMatches } from './patterns';
import { computePrivacyScore, resolveOverlaps } from './score';
import type { Finding, PIICategory, PrivacyScoreReport } from './types';
import { redactText, SessionVault } from './vault';

export type {
  CandidateMatch,
  CategoryScoreDetail,
  Finding,
  PIICategory,
  PrivacyScoreReport,
  Severity,
} from './types';
export { generateVerhoeffChecksum, normalizeAadhaarDigits, validateVerhoeff } from './verhoeff';
export {
  normalizeIdentifierValue,
  redactText,
  rehydrateText,
  scrubForSafeSharing,
  SessionVault,
} from './vault';
export { computePrivacyScore, resolveOverlaps } from './score';

/**
 * Detects personal identifiers in text, resolves overlaps (longest span, then highest severity),
 * and assigns stable session tokens via the provided or newly created SessionVault.
 */
export function detectPII(text: string, vault: SessionVault = new SessionVault()): Finding[] {
  if (!text) return [];
  const rawCandidates = [...detectPatternMatches(text), ...detectNames(text)];
  const resolved = resolveOverlaps(rawCandidates);

  return resolved.map((match, idx) => ({
    ...match,
    id: `f-${idx + 1}-${match.start}-${match.end}`,
    token: vault.register(match.category, match.text),
  }));
}

export interface RedactionResult {
  originalText: string;
  redactedText: string;
  findings: Finding[];
  beforeScore: PrivacyScoreReport;
  afterScore: PrivacyScoreReport;
}

/**
 * Runs full detection, redaction, and before/after privacy score computation.
 */
export function redactDocument(
  text: string,
  vault: SessionVault = new SessionVault(),
  disabledFindingIds: ReadonlySet<string> = new Set(),
  manualSpans: ReadonlyArray<{
    start: number;
    end: number;
    text: string;
    category?: PIICategory;
  }> = []
): RedactionResult {
  const autoFindings = detectPII(text, vault);
  const activeAuto = autoFindings.filter((f) => !disabledFindingIds.has(f.id));

  const manualCandidates: Finding[] = manualSpans
    .filter((span) => span.start >= 0 && span.end > span.start && span.end <= text.length)
    .filter((span) => !activeAuto.some((f) => span.start < f.end && span.end > f.start))
    .map((span, idx) => {
      const category = span.category ?? 'REDACTED';
      return {
        id: `m-${idx + 1}-${span.start}-${span.end}`,
        category,
        start: span.start,
        end: span.end,
        text: span.text,
        confidence: 1,
        severity: 'high',
        reason: 'Manually redacted by user',
        token: vault.register(category, span.text),
        manual: true,
      };
    });

  const combinedFindings = [...activeAuto, ...manualCandidates].sort((a, b) => a.start - b.start);
  const redactedText = redactText(text, combinedFindings);
  const beforeScore = computePrivacyScore(text);
  const afterScore = computePrivacyScore(redactedText);

  return {
    originalText: text,
    redactedText,
    findings: combinedFindings,
    beforeScore,
    afterScore,
  };
}
