import { describe, expect, it, vi } from 'vitest';
import { validateFrontendEnv } from '../lib/env';
import { generateVerhoeffChecksum, SessionVault } from '../lib/detect';
import type { ExplainResponse } from '../lib/llm/schema';
import { buildSafeWhatsAppText } from '../lib/share';
import {
  handleExplainRequest,
  validateEdgeEnv,
  type EnvGetter,
} from '../supabase/functions/explain/index.ts';

function makeTestEnv(overrides: Record<string, string | undefined> = {}): EnvGetter {
  const base: Record<string, string | undefined> = {
    GEMINI_API_KEY: 'placeholder-key',
    GEMINI_MODEL: 'gemini-3.8-flash',
    ALLOWED_ORIGIN: 'https://samjho.vercel.app',
    DENO_DEPLOYMENT_ID: undefined,
    ...overrides,
  };
  return (name: string) => base[name];
}

describe('Environment fail-fast validation', () => {
  it('fails fast naming missing Edge Function secrets', () => {
    expect(() =>
      validateEdgeEnv(
        makeTestEnv({
          GEMINI_API_KEY: undefined,
          ALLOWED_ORIGIN: '',
        })
      )
    ).toThrow(/GEMINI_API_KEY.*ALLOWED_ORIGIN/);
  });

  it('fails fast naming missing frontend Supabase variables', () => {
    expect(() => validateFrontendEnv({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL.*NEXT_PUBLIC_SUPABASE_ANON_KEY/
    );
    expect(() =>
      validateFrontendEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
      })
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('builds explainFunctionUrl cleanly when frontend env vars are valid', () => {
    const config = validateFrontendEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co/',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon',
    });
    expect(config.explainFunctionUrl).toBe('https://demo.supabase.co/functions/v1/explain');
  });
});

describe('Supabase Edge Function explain handler', () => {
  it('handles OPTIONS preflight for ALLOWED_ORIGIN and localhost in dev, and blocks unknown origins', async () => {
    const allowedRes = await handleExplainRequest(
      new Request('https://demo.supabase.co/functions/v1/explain', {
        method: 'OPTIONS',
        headers: { Origin: 'https://samjho.vercel.app' },
      }),
      { getEnv: makeTestEnv({ DENO_DEPLOYMENT_ID: 'prod-deploy' }) }
    );
    expect(allowedRes.status).toBe(204);
    expect(allowedRes.headers.get('Access-Control-Allow-Origin')).toBe('https://samjho.vercel.app');

    const devRes = await handleExplainRequest(
      new Request('http://127.0.0.1:54321/functions/v1/explain', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:3000' },
      }),
      { getEnv: makeTestEnv({ DENO_DEPLOYMENT_ID: undefined }) }
    );
    expect(devRes.status).toBe(204);
    expect(devRes.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');

    const blockedRes = await handleExplainRequest(
      new Request('https://demo.supabase.co/functions/v1/explain', {
        method: 'POST',
        headers: {
          Origin: 'https://evil.example',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redactedText: 'Electricity bill for [PERSON_01] due on 25 Nov 2026.',
          targetLanguage: 'en',
        }),
      }),
      { getEnv: makeTestEnv({ DENO_DEPLOYMENT_ID: 'prod-deploy' }) }
    );
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('returns 422 when unredacted Aadhaar, PAN, phone, or email reaches the Edge Function', async () => {
    const fetchSpy = vi.fn();
    const aadhaar = generateVerhoeffChecksum('49287163504');
    const res1 = await handleExplainRequest(
      new Request('https://demo.supabase.co/functions/v1/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://samjho.vercel.app',
        },
        body: JSON.stringify({
          redactedText: `Electricity bill for [PERSON_01]. Linked Aadhaar is ${aadhaar} and due date is 25 Nov 2026.`,
          targetLanguage: 'en',
        }),
      }),
      { getEnv: makeTestEnv(), fetchFn: fetchSpy as unknown as typeof fetch }
    );

    expect(res1.status).toBe(422);
    const data1 = (await res1.json()) as { blockedCategories?: string[] };
    expect(data1.blockedCategories).toContain('AADHAAR');
    expect(fetchSpy).not.toHaveBeenCalled();

    const res2 = await handleExplainRequest(
      new Request('https://demo.supabase.co/functions/v1/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redactedText:
            'Loan notice for [PERSON_01], PAN BKNPN7291M, mobile +91 98450 67123, email test.user@example.in.',
          targetLanguage: 'en',
        }),
      }),
      { getEnv: makeTestEnv(), fetchFn: fetchSpy as unknown as typeof fetch }
    );

    expect(res2.status).toBe(422);
    const data2 = (await res2.json()) as { blockedCategories?: string[] };
    expect(data2.blockedCategories).toEqual(expect.arrayContaining(['PAN', 'PHONE', 'EMAIL']));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 400 when payload exceeds 20,000 characters', async () => {
    const res = await handleExplainRequest(
      new Request('https://demo.supabase.co/functions/v1/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redactedText: 'a'.repeat(20005),
          targetLanguage: 'en',
        }),
      }),
      { getEnv: makeTestEnv() }
    );
    expect(res.status).toBe(400);
  });

  it('retries once on transient Gemini failure and returns validated JSON for clean redacted input', async () => {
    const validResponse: ExplainResponse = {
      documentType: 'Electricity Bill',
      summary: 'Bill for [PERSON_01] with Rs. 6,970.00 due by 25 Nov 2026.',
      keyFacts: [{ label: 'Consumer', value: '[PERSON_01]' }],
      deadlines: [{ date: '25 Nov 2026', what: 'Pay Rs. 6,970.00' }],
      amounts: [{ value: 'Rs. 6,970.00', what: 'Total payable' }],
      watchOuts: ['Late fee applies after 25 Nov 2026.'],
      nextSteps: ['Pay Rs. 6,970.00 before due date.'],
      draftReply: 'Dear Sir, regarding consumer bill for [PERSON_01].',
    };

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('Upstream timeout', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(validResponse) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const res = await handleExplainRequest(
      new Request('https://demo.supabase.co/functions/v1/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://samjho.vercel.app',
        },
        body: JSON.stringify({
          redactedText:
            'Monthly electricity bill for [PERSON_01]. Total amount Rs. 6,970.00 due before 25 Nov 2026.',
          targetLanguage: 'en',
          documentHint: 'Electricity bill',
        }),
      }),
      {
        getEnv: makeTestEnv(),
        fetchFn: fetchMock,
        backoffMs: 0,
      }
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]!;
    expect(String(calledUrl)).not.toContain('placeholder-key');
    expect((calledInit?.headers as Record<string, string>)['x-goog-api-key']).toBe(
      'placeholder-key'
    );
    const json = (await res.json()) as ExplainResponse;
    expect(json.documentType).toBe('Electricity Bill');
  });
});

describe('Safe WhatsApp share builder', () => {
  it('builds a message containing only summary, amounts, and next steps with zero identifiers', () => {
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
