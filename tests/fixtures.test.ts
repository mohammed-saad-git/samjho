import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { computePrivacyScore, detectPII, redactText, SessionVault } from '../lib/detect';
import { type ExplainResponse, type TargetLanguage } from '../lib/llm/schema';
import {
  getPreGeneratedSampleResponse,
  isSampleResponsesValid,
  type SampleResponsesEnvelope,
} from '../lib/samples';

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

  it('marks hand-written fixtures as invalid so sample documents require live Edge calls until regenerated', () => {
    const jsonPath = path.resolve(process.cwd(), 'fixtures/sample-responses.json');
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as SampleResponsesEnvelope;

    expect(raw._meta?.valid).toBe(false);
    expect(isSampleResponsesValid(raw)).toBe(false);

    const languages: TargetLanguage[] = ['en', 'hi', 'kn', 'ta', 'te'];
    for (const sampleId of SAMPLE_IDS) {
      for (const lang of languages) {
        expect(getPreGeneratedSampleResponse(sampleId, lang, raw)).toBeNull();
      }
    }
  });

  it('returns validated fixture content when _meta.valid is true and generatedBy matches supabase-edge-explain', () => {
    const validResponse: ExplainResponse = {
      documentType: 'Electricity Bill',
      summary: 'Monthly bill for [PERSON_01] due 25 Nov 2026.',
      keyFacts: [{ label: 'Consumer', value: '[PERSON_01]' }],
      deadlines: [{ date: '25 Nov 2026', what: 'Pay Rs. 6,970.00' }],
      amounts: [{ value: 'Rs. 6,970.00', what: 'Total payable' }],
      watchOuts: ['Check September arrears.'],
      nextSteps: ['Pay Rs. 6,970.00 by 25 Nov 2026.'],
      draftReply: 'Dear Sir/Madam, please verify bill for [PERSON_01].',
    };

    const envelope: SampleResponsesEnvelope = {
      _meta: {
        valid: true,
        generatedBy: 'supabase-edge-explain',
        generatedAt: '2026-11-14T12:30:00.000Z',
      },
      responses: {
        'electricity-bill': {
          en: validResponse,
        },
      },
    };

    expect(isSampleResponsesValid(envelope)).toBe(true);
    expect(getPreGeneratedSampleResponse('electricity-bill', 'en', envelope)).toEqual(
      validResponse
    );
    expect(getPreGeneratedSampleResponse('electricity-bill', 'hi', envelope)).toBeNull();
  });
});
