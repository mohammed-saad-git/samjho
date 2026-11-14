import { describe, expect, it } from 'vitest';
import {
  detectPII,
  generateVerhoeffChecksum,
  redactText,
  rehydrateText,
  scrubForSafeSharing,
  SessionVault,
} from '../lib/detect';

describe('SessionVault, round-trip rehydration, and safe sharing', () => {
  it('satisfies rehydrate(redact(x)) === x on realistic documents', () => {
    const aadhaar = generateVerhoeffChecksum('58192046371');
    const original = [
      'Applicant Name: Shri Devendra Kumar Verma',
      'Application No: SW-UP-2026-99412',
      `Aadhaar Number: ${aadhaar}`,
      'Date of Birth: 19 May 2004',
      'Mobile: 94150 28374',
      'Bank Account No: 320988410052',
      'IFSC: SBIN0004123',
      'Address: Plot 47, Gomti Nagar Extension, Lucknow - 226010',
      'Approved Grant: Rs. 18,500.00 before 10 Dec 2026.',
    ].join('\n');

    const vault = new SessionVault();
    const findings = detectPII(original, vault);
    const redacted = redactText(original, findings);
    const restored = rehydrateText(redacted, vault);

    expect(redacted).not.toContain('Devendra Kumar Verma');
    expect(redacted).not.toContain(aadhaar);
    expect(redacted).not.toContain('94150 28374');
    expect(restored).toBe(original);
  });

  it('handles mangled or missing-zero LLM tokens safely without throwing', () => {
    const vault = new SessionVault();
    vault.register('PERSON', 'Ananya Deshmukh');
    vault.register('ACCOUNT', 'BCBL-LN-2024-004819');

    const mangled =
      'Dear [PERSON_1], please pay into [account_01] or check [ PERSON_01 ] and unknown [PHONE_99].';
    const rehydrated = rehydrateText(mangled, vault);

    expect(rehydrated).toBe(
      'Dear Ananya Deshmukh, please pay into BCBL-LN-2024-004819 or check Ananya Deshmukh and unknown [PHONE_99].'
    );
  });

  it('scrubs both real vault values and placeholder tokens from WhatsApp share output', () => {
    const vault = new SessionVault();
    vault.register('PERSON', 'Rameshwar Prasad Sharma');
    vault.register('PHONE', '+91 98450 67123');

    const rawShare =
      'Summary for Rameshwar Prasad Sharma ([PERSON_01]): Pay Rs. 6,970.00 by 25 Nov 2026. Call +91 98450 67123.';
    const safe = scrubForSafeSharing(rawShare, vault);

    expect(safe).not.toContain('Rameshwar Prasad Sharma');
    expect(safe).not.toContain('+91 98450 67123');
    expect(safe).not.toContain('[PERSON_01]');
    expect(safe).toContain('Rs. 6,970.00');
  });
});
