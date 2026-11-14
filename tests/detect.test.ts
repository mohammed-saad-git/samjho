import { describe, expect, it } from 'vitest';
import {
  computePrivacyScore,
  detectPII,
  generateVerhoeffChecksum,
  redactText,
  resolveOverlaps,
  SessionVault,
  type CandidateMatch,
} from '../lib/detect';

describe('Overlap resolution, token stability, and computed privacy score', () => {
  it('resolves overlaps by longest span first, then highest severity', () => {
    const candidates: CandidateMatch[] = [
      {
        category: 'PHONE',
        start: 10,
        end: 20,
        text: '9845067123',
        confidence: 0.94,
        severity: 'high',
      },
      {
        category: 'ADDRESS',
        start: 0,
        end: 35,
        text: 'Flat 304, 9845067123, Pin 560038',
        confidence: 0.85,
        severity: 'medium',
      },
      {
        category: 'IFSC',
        start: 40,
        end: 51,
        text: 'SBIN0004123',
        confidence: 0.95,
        severity: 'medium',
      },
      {
        category: 'ACCOUNT',
        start: 40,
        end: 51,
        text: 'SBIN0004123',
        confidence: 0.91,
        severity: 'high',
      },
    ];

    const resolved = resolveOverlaps(candidates);
    // Longest span (ADDRESS 0..35) wins over shorter PHONE (10..20)
    // Equal-length (40..51): high severity (ACCOUNT) wins over medium (IFSC)
    expect(resolved.map((r) => r.category)).toEqual(['ADDRESS', 'ACCOUNT']);
  });

  it('assigns stable tokens for identical values and normalized equivalents within a session', () => {
    const vault = new SessionVault();
    const text = [
      'Borrower: Smt. Ananya Deshmukh.',
      'Registered Mobile: +91 98204 51920.',
      'Please contact Ananya Deshmukh on 9820451920.',
    ].join('\n');

    const findings = detectPII(text, vault);
    const personTokens = findings.filter((f) => f.category === 'PERSON').map((f) => f.token);
    const phoneTokens = findings.filter((f) => f.category === 'PHONE').map((f) => f.token);

    expect(personTokens).toEqual(['[PERSON_01]', '[PERSON_01]']);
    expect(phoneTokens).toEqual(['[PHONE_01]', '[PHONE_01]']);
  });

  it('computes a significantly higher privacy score after redaction using the exact same scorer', () => {
    const aadhaar = generateVerhoeffChecksum('49287163504');
    const original = [
      'Consumer Name: Shri Rameshwar Prasad Sharma',
      'Consumer No: KA-BLR-88412903',
      `Aadhaar: ${aadhaar}`,
      'Mobile: +91 98450 67123',
      'Email: rameshwar.sharma@example.com',
      'Address: Flat 304, Indiranagar, Bengaluru - 560038',
      'Total Payable: Rs. 6,970.00 by 25 Nov 2026',
    ].join('\n');

    const findings = detectPII(original);
    const redacted = redactText(original, findings);

    const before = computePrivacyScore(original);
    const after = computePrivacyScore(redacted);

    expect(before.score).toBeLessThan(40);
    expect(after.score).toBeGreaterThanOrEqual(90);
    expect(after.score).toBeGreaterThan(before.score + 50);
  });
});
