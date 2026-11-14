import { describe, expect, it } from 'vitest';
import { detectPII, generateVerhoeffChecksum } from '../lib/detect';

describe('Pattern detectors — positive and negative cases', () => {
  it('detects valid Verhoeff Aadhaar and ignores invalid 12-digit numbers', () => {
    const valid = generateVerhoeffChecksum('58192046371');
    const spaced = `${valid.slice(0, 4)} ${valid.slice(4, 8)} ${valid.slice(8, 12)}`;
    const invalid = `${valid.slice(0, 11)}${(Number(valid[11]) + 1) % 10}`;

    const text = `Aadhaar: ${spaced}. Reference code: ${invalid}.`;
    const findings = detectPII(text);
    const aadhaars = findings.filter((f) => f.category === 'AADHAAR');

    expect(aadhaars).toHaveLength(1);
    expect(aadhaars[0]?.text).toBe(spaced);
  });

  it('detects PAN with valid 4th-character entity type and rejects invalid 4th char', () => {
    const text = 'Valid PAN: AZSPC4819K, trust PAN: AABCT1234E, invalid 4th char: ABCXE1234F.';
    const pans = detectPII(text).filter((f) => f.category === 'PAN');
    expect(pans.map((p) => p.text)).toEqual(['AZSPC4819K', 'AABCT1234E']);
  });

  it('validates exact PAN 4th-character entity type rule', () => {
    const text =
      'Individual PAN: BKNPN7291M. Trust PAN: AAATB1234Z. Company PAN: AABCT9988K. Bad 4th char: ABCDE1234F.';
    const pans = detectPII(text).filter((f) => f.category === 'PAN');
    expect(pans.map((p) => p.text)).toEqual(['BKNPN7291M', 'AAATB1234Z', 'AABCT9988K']);
  });

  it('detects Indian mobile numbers (+91, 0, plain) and rejects landlines/short digits', () => {
    const text = 'Call +91 98450 67123 or 09820451920 or 9444182309. Office ext: 1234567890.';
    const phones = detectPII(text).filter((f) => f.category === 'PHONE');
    expect(phones.map((p) => p.text)).toEqual(['+91 98450 67123', '09820451920', '9444182309']);
  });

  it('detects email, UPI ID, IFSC, passport, and DOB', () => {
    const text = [
      'Email: kavitha.rajagopal@example.in',
      'UPI: ramesh.sharma@okicici',
      'IFSC: SBIN0004123',
      'Passport: L4829103',
      'DOB: 14/08/1984',
    ].join('\n');

    const findings = detectPII(text);
    expect(findings.map((f) => f.category)).toEqual(['EMAIL', 'UPI', 'IFSC', 'PASSPORT', 'DOB']);
  });

  it('detects keyword-anchored account/consumer/loan/application numbers', () => {
    const text =
      'Consumer No: KA-BLR-88412903 | Loan A/c: BCBL-LN-2024-004819 | Application No: SW-UP-2026-99412';
    const accounts = detectPII(text).filter((f) => f.category === 'ACCOUNT');
    expect(accounts.map((a) => a.text)).toEqual([
      'KA-BLR-88412903',
      'BCBL-LN-2024-004819',
      'SW-UP-2026-99412',
    ]);
  });

  it('detects PIN-anchored addresses and honorific/labeled person names', () => {
    const text =
      'Consumer Name: Shri Rameshwar Prasad Sharma\nAddress: Flat 304, Indiranagar, Bengaluru - 560038';
    const findings = detectPII(text);
    expect(
      findings.some((f) => f.category === 'PERSON' && f.text === 'Rameshwar Prasad Sharma')
    ).toBe(true);
    expect(findings.some((f) => f.category === 'ADDRESS' && f.text.includes('560038'))).toBe(true);
  });

  it('DOES NOT redact amounts, bill dates, deadlines, or document types', () => {
    const text = [
      'MONTHLY ELECTRICITY BILL AND DISCONNECTION NOTICE',
      'Bill Date: 04 Nov 2026',
      'Energy Charges: Rs. 2,140.00',
      'Total Payable: ₹6,970.00',
      'Payment Due Date: 25 Nov 2026',
      'Disconnection Date: 05/12/2026',
    ].join('\n');

    const findings = detectPII(text);
    expect(findings).toHaveLength(0);
  });
});
