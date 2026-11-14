import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { computePrivacyScore, detectPII, redactText, SessionVault } from '../lib/detect';
import { ExplainResponseSchema } from '../lib/llm/schema';

const SAMPLE_IDS = [
  'electricity-bill',
  'bank-loan-notice',
  'rental-agreement',
  'government-notice',
] as const;

describe('Sample fixture redaction and schema validation', () => {
  it.each(SAMPLE_IDS)('leaves zero high-severity findings after redacting %s', (sampleId) => {
    const filePath = path.resolve(process.cwd(), 'fixtures/samples', `${sampleId}.txt`);
    const original = fs.readFileSync(filePath, 'utf8');

    const vault = new SessionVault();
    const findings = detectPII(original, vault);
    expect(findings.length).toBeGreaterThanOrEqual(5);

    const redacted = redactText(original, findings);
    const postFindings = detectPII(redacted);
    const highSeverityPost = postFindings.filter((f) => f.severity === 'high');

    expect(highSeverityPost).toEqual([]);
    expect(postFindings).toEqual([]);

    const beforeScore = computePrivacyScore(original);
    const afterScore = computePrivacyScore(redacted);
    expect(afterScore.score).toBeGreaterThan(beforeScore.score);
  });

  it('validates all pre-generated sample responses across all 5 languages', () => {
    const jsonPath = path.resolve(process.cwd(), 'fixtures/sample-responses.json');
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Record<
      string,
      Record<string, unknown>
    >;

    for (const sampleId of SAMPLE_IDS) {
      const langMap = raw[sampleId];
      expect(langMap).toBeDefined();
      for (const lang of ['en', 'hi', 'kn', 'ta', 'te']) {
        const parsed = ExplainResponseSchema.safeParse(langMap?.[lang]);
        expect(parsed.success, `Invalid schema for ${sampleId} (${lang})`).toBe(true);
      }
    }
  });
});
