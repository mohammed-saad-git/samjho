import { describe, expect, it } from 'vitest';
import { POST } from '../app/api/explain/route';
import { generateVerhoeffChecksum, SessionVault } from '../lib/detect';
import type { ExplainResponse } from '../lib/llm/schema';
import { buildSafeWhatsAppText } from '../lib/share';

describe('API defense-in-depth guard and safe WhatsApp sharing', () => {
  it('returns 422 when unredacted Aadhaar, PAN, phone, or email reaches /api/explain', async () => {
    const aadhaar = generateVerhoeffChecksum('49287163504');
    const req = new Request('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.10' },
      body: JSON.stringify({
        redactedText: `Electricity bill for [PERSON_01]. Linked Aadhaar is ${aadhaar} and due date is 25 Nov 2026.`,
        targetLanguage: 'en',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const data = (await res.json()) as { blockedCategories?: string[] };
    expect(data.blockedCategories).toContain('AADHAAR');
  });

  it('returns 422 when unredacted PAN or mobile number reaches /api/explain', async () => {
    const req = new Request('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.11' },
      body: JSON.stringify({
        redactedText: 'Loan notice for [PERSON_01], PAN BKNPN7291M, mobile +91 98450 67123.',
        targetLanguage: 'en',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const data = (await res.json()) as { blockedCategories?: string[] };
    expect(data.blockedCategories).toEqual(expect.arrayContaining(['PAN', 'PHONE']));
  });

  it('returns 400 when payload exceeds 20,000 characters', async () => {
    const req = new Request('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.12' },
      body: JSON.stringify({
        redactedText: 'a'.repeat(20005),
        targetLanguage: 'en',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('builds a WhatsApp message containing only summary, amounts, and next steps with zero identifiers', () => {
    const vault = new SessionVault();
    vault.register('PERSON', 'Rameshwar Prasad Sharma');
    vault.register('ACCOUNT', 'KA-BLR-88412903');
    vault.register('PHONE', '+91 98450 67123');

    const explanation: ExplainResponse = {
      documentType: 'Electricity Bill',
      summary: 'Bill for [PERSON_01] on consumer account [ACCOUNT_01] due 25 Nov 2026.',
      keyFacts: [{ label: 'Phone', value: '[PHONE_01]' }],
      deadlines: [{ date: '25 Nov 2026', what: 'Pay total' }],
      amounts: [{ value: 'Rs. 6,970.00', what: 'Total payable' }],
      watchOuts: ['Check [PHONE_01] alert'],
      nextSteps: ['Pay Rs. 6,970.00 before 25 Nov 2026.'],
      draftReply: 'Dear Sir, I am [PERSON_01], phone [PHONE_01].',
    };

    const shareText = buildSafeWhatsAppText(explanation, vault);
    expect(shareText).toContain('Rs. 6,970.00');
    expect(shareText).toContain('Pay Rs. 6,970.00 before 25 Nov 2026.');
    expect(shareText).not.toContain('Rameshwar');
    expect(shareText).not.toContain('KA-BLR-88412903');
    expect(shareText).not.toContain('98450');
    expect(shareText).not.toContain('[PERSON_01]');
    expect(shareText).not.toContain('[ACCOUNT_01]');
  });
});
