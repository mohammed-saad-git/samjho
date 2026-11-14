import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateFrontendEnv } from '../lib/env';
import { generateVerhoeffChecksum, SessionVault } from '../lib/detect';
import {
  executeExplanationRequest,
  SupabaseEdgeLLMProvider,
  type ExplainResponse,
} from '../lib/llm';
import { buildSafeWhatsAppText } from '../lib/share';
import {
  handleExplainRequest,
  parsePublishableKeys,
  resetRateLimitStore,
  validateEdgeEnv,
  type EnvGetter,
} from '../supabase/functions/explain/index.ts';

const TEST_PUBLISHABLE_KEY = 'sb_publishable_test_key_01';

function makeTestEnv(overrides: Record<string, string | undefined> = {}): EnvGetter {
  const base: Record<string, string | undefined> = {
    GEMINI_API_KEY: 'placeholder-key',
    GEMINI_MODEL: 'gemini-3.8-flash',
    ALLOWED_ORIGIN: 'https://samjho.vercel.app',
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: TEST_PUBLISHABLE_KEY }),
    DENO_DEPLOYMENT_ID: undefined,
    ...overrides,
  };
  return (name: string) => base[name];
}

describe('Environment fail-fast validation', () => {
  it('fails fast naming missing Edge Function secrets without echoing secret values', () => {
    expect(() =>
      validateEdgeEnv(
        makeTestEnv({
          GEMINI_API_KEY: undefined,
          GEMINI_MODEL: '',
          ALLOWED_ORIGIN: '',
          SUPABASE_PUBLISHABLE_KEYS: '',
        })
      )
    ).toThrow(/GEMINI_API_KEY.*GEMINI_MODEL.*ALLOWED_ORIGIN.*SUPABASE_PUBLISHABLE_KEYS/);

    let thrownMessage = '';
    try {
      validateEdgeEnv(
        makeTestEnv({
          GEMINI_API_KEY: 'placeholder-secret-never-echoed',
          GEMINI_MODEL: undefined,
          ALLOWED_ORIGIN: 'https://samjho.vercel.app',
        })
      );
    } catch (error) {
      thrownMessage = error instanceof Error ? error.message : String(error);
    }
    expect(thrownMessage).toContain('GEMINI_MODEL');
    expect(thrownMessage).not.toContain('placeholder-secret-never-echoed');
    expect(thrownMessage).not.toContain(TEST_PUBLISHABLE_KEY);
  });

  it('parses SUPABASE_PUBLISHABLE_KEYS from JSON dictionaries, arrays, or comma-separated strings', () => {
    expect(
      parsePublishableKeys('{"default":"sb_publishable_one","alt":"sb_publishable_two"}')
    ).toEqual(['sb_publishable_one', 'sb_publishable_two']);
    expect(parsePublishableKeys('["sb_publishable_one","sb_publishable_two"]')).toEqual([
      'sb_publishable_one',
      'sb_publishable_two',
    ]);
    expect(parsePublishableKeys('sb_publishable_one, sb_publishable_two')).toEqual([
      'sb_publishable_one',
      'sb_publishable_two',
    ]);
    expect(parsePublishableKeys('')).toEqual([]);
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
  beforeEach(() => {
    resetRateLimitStore();
  });

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
      { getEnv: makeTestEnv({ ENVIRONMENT: 'development' }) }
    );
    expect(devRes.status).toBe(204);
    expect(devRes.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');

    const nonDevLocalhostRes = await handleExplainRequest(
      new Request('http://127.0.0.1:54321/functions/v1/explain', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:3000' },
      }),
      { getEnv: makeTestEnv({ DENO_DEPLOYMENT_ID: undefined, ENVIRONMENT: undefined }) }
    );
    expect(nonDevLocalhostRes.status).toBe(403);
    expect(await nonDevLocalhostRes.json()).toMatchObject({ code: 'ORIGIN_NOT_ALLOWED' });

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
          apikey: TEST_PUBLISHABLE_KEY,
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
        headers: {
          'Content-Type': 'application/json',
          apikey: TEST_PUBLISHABLE_KEY,
        },
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
        headers: {
          'Content-Type': 'application/json',
          apikey: TEST_PUBLISHABLE_KEY,
        },
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
          apikey: TEST_PUBLISHABLE_KEY,
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

  function makeValidExplainResponse(overrides: Partial<ExplainResponse> = {}): ExplainResponse {
    return {
      documentType: 'Electricity Bill',
      summary: 'Monthly bill for [PERSON_01].',
      keyFacts: [{ label: 'Consumer', value: '[PERSON_01]' }],
      deadlines: [{ date: '2026-12-01', what: 'Pay total due' }],
      amounts: [{ value: 'Rs 1,200', what: 'Amount payable' }],
      watchOuts: ['Late fee after due date'],
      nextSteps: ['Pay before due date'],
      draftReply: 'Please confirm receipt for [PERSON_01].',
      ...overrides,
    };
  }

  function makeExplainPostRequest(redactedText: string): Request {
    return new Request('https://project-ref.supabase.co/functions/v1/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://samjho.vercel.app',
        apikey: TEST_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        redactedText,
        targetLanguage: 'en',
        documentHint: 'Electricity Bill',
      }),
    });
  }

  it('sends compliant Gemini generateContent payload with minimal thinking config', async () => {
    const capturePayloads: Array<Record<string, unknown>> = [];
    const captureUrls: string[] = [];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      captureUrls.push(String(url));
      capturePayloads.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: 'STOP',
              content: { parts: [{ text: JSON.stringify(makeValidExplainResponse()) }] },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const input = 'Dear [PERSON_01], your electricity bill of Rs 1200 is due on 2026-12-01.';
    const res38 = await handleExplainRequest(makeExplainPostRequest(input), {
      getEnv: makeTestEnv({ GEMINI_MODEL: 'gemini-3.8-flash' }),
      fetchFn: fetchMock as unknown as typeof fetch,
      backoffMs: 0,
    });
    expect(res38.status).toBe(200);
    expect(captureUrls[0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'
    );
    const body38 = capturePayloads[0] as {
      systemInstruction: { parts: Array<{ text: string }> };
      contents: Array<{ parts: Array<{ text: string }> }>;
      generationConfig: {
        responseMimeType: string;
        responseSchema: { type: string };
        temperature: number;
        maxOutputTokens: number;
        thinkingConfig: Record<string, unknown>;
      };
    };
    expect(body38.systemInstruction.parts[0]?.text.length).toBeGreaterThan(10);
    expect(body38.contents[0]?.parts[0]?.text).toContain('Dear [PERSON_01]');
    expect(body38.generationConfig.responseMimeType).toBe('application/json');
    expect(body38.generationConfig.responseSchema.type).toBe('OBJECT');
    expect(body38.generationConfig.temperature).toBe(0.1);
    expect(body38.generationConfig.maxOutputTokens).toBe(2048);
    expect(body38.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'minimal' });

    const res25 = await handleExplainRequest(makeExplainPostRequest(input), {
      getEnv: makeTestEnv({ GEMINI_MODEL: 'gemini-2.5-flash' }),
      fetchFn: fetchMock as unknown as typeof fetch,
      backoffMs: 0,
    });
    expect(res25.status).toBe(200);
    const body25 = capturePayloads[1] as {
      generationConfig: { thinkingConfig: Record<string, unknown> };
    };
    expect(body25.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it('maps upstream HTTP and timeout failures to stable codes without leaking upstream text', async () => {
    const input = 'Dear [PERSON_01], your electricity bill of Rs 1200 is due on 2026-12-01.';

    const cases: Array<{
      upstreamStatus: number | 'ABORT';
      upstreamBody: string;
      expectedStatus: number;
      expectedCode: string;
      expectedCalls: number;
    }> = [
      {
        upstreamStatus: 429,
        upstreamBody: 'upstream secret rate limit details',
        expectedStatus: 429,
        expectedCode: 'RATE_LIMITED',
        expectedCalls: 2,
      },
      {
        upstreamStatus: 500,
        upstreamBody: 'upstream secret stack trace',
        expectedStatus: 502,
        expectedCode: 'UPSTREAM_ERROR',
        expectedCalls: 2,
      },
      {
        upstreamStatus: 401,
        upstreamBody: 'upstream secret auth failure',
        expectedStatus: 502,
        expectedCode: 'AUTH_FAILED',
        expectedCalls: 1,
      },
      {
        upstreamStatus: 403,
        upstreamBody: 'upstream secret permission denied',
        expectedStatus: 502,
        expectedCode: 'AUTH_FAILED',
        expectedCalls: 1,
      },
      {
        upstreamStatus: 404,
        upstreamBody: 'upstream secret model not found',
        expectedStatus: 502,
        expectedCode: 'MODEL_UNAVAILABLE',
        expectedCalls: 1,
      },
      {
        upstreamStatus: 'ABORT',
        upstreamBody: 'never shown',
        expectedStatus: 504,
        expectedCode: 'TIMEOUT',
        expectedCalls: 2,
      },
    ];

    for (const c of cases) {
      const fetchMock = vi.fn(async () => {
        if (c.upstreamStatus === 'ABORT') {
          throw new DOMException('The operation was aborted', 'AbortError');
        }
        return new Response(c.upstreamBody, { status: c.upstreamStatus });
      });

      const res = await handleExplainRequest(makeExplainPostRequest(input), {
        getEnv: makeTestEnv(),
        fetchFn: fetchMock as unknown as typeof fetch,
        backoffMs: 0,
      });

      expect(res.status).toBe(c.expectedStatus);
      expect(fetchMock).toHaveBeenCalledTimes(c.expectedCalls);
      const bodyText = await res.text();
      expect(bodyText).not.toContain(c.upstreamBody);
      expect(JSON.parse(bodyText)).toMatchObject({ code: c.expectedCode });
    }
  });

  it('rejects empty candidates, bad finishReason, unrepairable JSON, repairs fenced JSON, and strips hallucinated tokens', async () => {
    const input = 'Dear [PERSON_01], your electricity bill of Rs 1200 is due on 2026-12-01.';

    for (const badPayload of [
      { candidates: [] },
      {
        candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: '{}' }] } }],
      },
      {
        candidates: [
          { finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"documentType":"x"' }] } },
        ],
      },
      {
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'not json at all {' }] } }],
      },
    ]) {
      const fetchMock = vi.fn(
        async () =>
          new Response(JSON.stringify(badPayload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      );
      const res = await handleExplainRequest(makeExplainPostRequest(input), {
        getEnv: makeTestEnv(),
        fetchFn: fetchMock as unknown as typeof fetch,
        backoffMs: 0,
      });
      expect(res.status).toBe(502);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(await res.json()).toMatchObject({ code: 'BAD_MODEL_OUTPUT' });
    }

    const withFencedTrailingCommaAndHallucinatedToken = [
      '```json',
      JSON.stringify(
        makeValidExplainResponse({
          summary: 'Monthly bill for [PERSON_01] and [PERSON_99].',
          draftReply: 'Please update [PHONE_04] for [PERSON_01].',
        })
      ).replace('}', ',}'),
      '```',
    ].join('\n');

    const repairFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: 'STOP',
                content: { parts: [{ text: withFencedTrailingCommaAndHallucinatedToken }] },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    );
    const repairedRes = await handleExplainRequest(makeExplainPostRequest(input), {
      getEnv: makeTestEnv(),
      fetchFn: repairFetch as unknown as typeof fetch,
      backoffMs: 0,
    });
    expect(repairedRes.status).toBe(200);
    const repairedJson = (await repairedRes.json()) as ExplainResponse;
    expect(repairedJson.summary).toContain('[PERSON_01]');
    expect(repairedJson.summary).not.toContain('[PERSON_99]');
    expect(repairedJson.summary).toContain('[redacted]');
    expect(repairedJson.draftReply).not.toContain('[PHONE_04]');
    expect(repairedJson.draftReply).toContain('[PERSON_01]');
  });

  it('logs only metadata (status, latencyMs, inputLength, errorCode) and never document text or secrets', async () => {
    const logs: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: 'STOP',
                content: { parts: [{ text: JSON.stringify(makeValidExplainResponse()) }] },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    );

    const safeInput = 'Confidential sentinel text for [PERSON_01] due soon.';
    await handleExplainRequest(makeExplainPostRequest(safeInput), {
      getEnv: makeTestEnv(),
      fetchFn: fetchMock as unknown as typeof fetch,
      backoffMs: 0,
      logger: (entry) => logs.push(entry as unknown as Record<string, unknown>),
    });

    const piiInput = 'Unique sentinel text 9876543210 that should not appear in logs.';
    await handleExplainRequest(makeExplainPostRequest(piiInput), {
      getEnv: makeTestEnv(),
      fetchFn: fetchMock as unknown as typeof fetch,
      backoffMs: 0,
      logger: (entry) => logs.push(entry as unknown as Record<string, unknown>),
    });

    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ status: 200, inputLength: safeInput.length });
    expect(typeof logs[0]?.latencyMs).toBe('number');
    expect(logs[1]).toMatchObject({
      status: 422,
      inputLength: piiInput.length,
      errorCode: 'UNREDACTED_PII',
    });
    const serializedLogs = JSON.stringify(logs);
    expect(serializedLogs).not.toContain('sentinel');
    expect(serializedLogs).not.toContain('placeholder-key');
  });

  it('rejects requests missing or mismatching apikey against SUPABASE_PUBLISHABLE_KEYS with 401 AUTH_FAILED', async () => {
    const fetchSpy = vi.fn();
    const validBody = JSON.stringify({
      redactedText: 'Electricity bill for [PERSON_01]. Amount due Rs. 1,200 on 2026-12-01.',
      targetLanguage: 'en',
    });

    const authCases: Array<Record<string, string>> = [
      { 'Content-Type': 'application/json', Origin: 'https://samjho.vercel.app' },
      {
        'Content-Type': 'application/json',
        Origin: 'https://samjho.vercel.app',
        apikey: 'sb_publishable_wrong_key',
      },
      {
        'Content-Type': 'application/json',
        Origin: 'https://samjho.vercel.app',
        Authorization: `Bearer ${TEST_PUBLISHABLE_KEY}`,
      },
      {
        'Content-Type': 'application/json',
        Origin: 'https://samjho.vercel.app',
        Authorization: `Bearer ${TEST_PUBLISHABLE_KEY}`,
        apikey: TEST_PUBLISHABLE_KEY,
      },
    ];

    for (const headers of authCases) {
      const res = await handleExplainRequest(
        new Request('https://demo.supabase.co/functions/v1/explain', {
          method: 'POST',
          headers,
          body: validBody,
        }),
        { getEnv: makeTestEnv(), fetchFn: fetchSpy as unknown as typeof fetch }
      );
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ code: 'AUTH_FAILED' });
      expect(fetchSpy).not.toHaveBeenCalled();
    }
  });

  it('enforces best-effort in-memory per-IP rate limiting and returns 429 RATE_LIMITED', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: 'STOP',
                content: { parts: [{ text: JSON.stringify(makeValidExplainResponse()) }] },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    );

    const makeIpRequest = (ip: string) =>
      new Request('https://demo.supabase.co/functions/v1/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://samjho.vercel.app',
          apikey: TEST_PUBLISHABLE_KEY,
          'x-forwarded-for': `${ip}, 10.0.0.1`,
        },
        body: JSON.stringify({
          redactedText: 'Electricity bill for [PERSON_01]. Amount due Rs. 1,200 on 2026-12-01.',
          targetLanguage: 'en',
        }),
      });

    const deps = {
      getEnv: makeTestEnv(),
      fetchFn: fetchMock as unknown as typeof fetch,
      backoffMs: 0,
      rateLimitMax: 2,
      rateLimitWindowMs: 60_000,
    };

    expect((await handleExplainRequest(makeIpRequest('203.0.113.10'), deps)).status).toBe(200);
    expect((await handleExplainRequest(makeIpRequest('203.0.113.10'), deps)).status).toBe(200);

    const limitedRes = await handleExplainRequest(makeIpRequest('203.0.113.10'), deps);
    expect(limitedRes.status).toBe(429);
    expect(await limitedRes.json()).toMatchObject({ code: 'RATE_LIMITED' });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const otherIpRes = await handleExplainRequest(makeIpRequest('203.0.113.11'), deps);
    expect(otherIpRes.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
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

describe('Non-sample upload and invalidated sample fallback behavior', () => {
  it('produces an error state (and never content) for an uploaded non-sample document with no backend configured', async () => {
    const provider = new SupabaseEdgeLLMProvider({ envOverride: {}, backoffMs: 0 });
    const outcome = await executeExplanationRequest({
      redactedText:
        'Final demand notice for [PERSON_01] on consumer account [ACCOUNT_01] for Rs. 4,200.00 due 28 Nov 2026.',
      targetLanguage: 'en',
      activeSampleId: null,
      hasModifiedRedactions: false,
      provider,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.explanation).toBeNull();
    expect(outcome.hasSentToServer).toBe(false);
    if (!outcome.ok) {
      expect(outcome.explainError).toMatch(
        /Missing required frontend environment variable\(s\): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY/
      );
    }
  });

  it('calls the live provider for sample documents while sample-responses.json is invalid, producing an error state when no backend is configured', async () => {
    const provider = new SupabaseEdgeLLMProvider({ envOverride: {}, backoffMs: 0 });
    const outcome = await executeExplanationRequest({
      redactedText:
        'Monthly electricity bill for [PERSON_01], Consumer No [ACCOUNT_01]. Total Amount Payable: Rs. 6,970.00 due 25 Nov 2026.',
      targetLanguage: 'en',
      documentHint: 'Electricity bill',
      activeSampleId: 'electricity-bill',
      hasModifiedRedactions: false,
      provider,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.explanation).toBeNull();
    expect(outcome.hasSentToServer).toBe(false);
    if (!outcome.ok) {
      expect(outcome.explainError).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
    }
  });

  it('returns an error state without substituting fallback content when a live request fails over the network', async () => {
    const failingFetch = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const provider = new SupabaseEdgeLLMProvider({
      fetchFn: failingFetch,
      envOverride: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon',
      },
      backoffMs: 0,
    });

    const outcome = await executeExplanationRequest({
      redactedText:
        'Monthly electricity bill for [PERSON_01], Consumer No [ACCOUNT_01]. Total Amount Payable: Rs. 6,970.00.',
      targetLanguage: 'en',
      activeSampleId: null,
      hasModifiedRedactions: false,
      provider,
    });

    expect(failingFetch).toHaveBeenCalledTimes(2); // initial attempt + single retry
    expect(outcome.ok).toBe(false);
    expect(outcome.explanation).toBeNull();
    expect(outcome.hasSentToServer).toBe(false);
    if (!outcome.ok) {
      expect(outcome.explainError).toContain('Unable to reach the explanation service');
    }
  });

  it('maps Edge Function error codes to plain-language UI messages and returns zero explanation content', async () => {
    const cases: Array<{
      status: number;
      code: string;
      expectedMessage: string;
    }> = [
      {
        status: 429,
        code: 'RATE_LIMITED',
        expectedMessage: 'The service is busy. Try again in a minute.',
      },
      {
        status: 504,
        code: 'TIMEOUT',
        expectedMessage: 'The explanation request timed out. Please try again.',
      },
      {
        status: 502,
        code: 'BAD_MODEL_OUTPUT',
        expectedMessage: 'The AI returned an incomplete or unreadable response. Please try again.',
      },
      {
        status: 502,
        code: 'AUTH_FAILED',
        expectedMessage: 'The explanation service could not authenticate with the AI provider.',
      },
      {
        status: 502,
        code: 'MODEL_UNAVAILABLE',
        expectedMessage:
          'The explanation model is currently unavailable. Please try again shortly.',
      },
      {
        status: 502,
        code: 'UPSTREAM_ERROR',
        expectedMessage: 'The explanation service encountered an upstream error. Please try again.',
      },
    ];

    for (const c of cases) {
      const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Raw backend message', code: c.code }), {
          status: c.status,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const provider = new SupabaseEdgeLLMProvider({
        fetchFn: mockFetch,
        envOverride: {
          NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon',
        },
        backoffMs: 0,
      });

      const outcome = await executeExplanationRequest({
        redactedText:
          'Monthly electricity bill for [PERSON_01], Consumer No [ACCOUNT_01]. Total Amount Payable: Rs. 6,970.00.',
        targetLanguage: 'en',
        activeSampleId: null,
        hasModifiedRedactions: false,
        provider,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(outcome.ok).toBe(false);
      expect(outcome.explanation).toBeNull();
      expect(outcome.hasSentToServer).toBe(false);
      if (!outcome.ok) {
        expect(outcome.errorCode).toBe(c.code);
        expect(outcome.explainError).toBe(c.expectedMessage);
      }
    }
  });

  it('sends the publishable key in apikey header only and never in Authorization', async () => {
    const captureHeaders: Record<string, string>[] = [];
    const mockFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      captureHeaders.push((init?.headers ?? {}) as Record<string, string>);
      return new Response(
        JSON.stringify({
          documentType: 'Electricity Bill',
          summary: 'Monthly bill for [PERSON_01].',
          keyFacts: [{ label: 'Consumer', value: '[PERSON_01]' }],
          deadlines: [{ date: '2026-12-01', what: 'Pay total due' }],
          amounts: [{ value: 'Rs 1,200', what: 'Amount payable' }],
          watchOuts: ['Late fee applies'],
          nextSteps: ['Pay before due date'],
          draftReply: 'Please confirm receipt for [PERSON_01].',
        } satisfies ExplainResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const provider = new SupabaseEdgeLLMProvider({
      fetchFn: mockFetch as unknown as typeof fetch,
      envOverride: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_client_key_01',
      },
      backoffMs: 0,
    });

    await provider.explain({
      redactedText: 'Monthly electricity bill for [PERSON_01]. Total Amount Payable: Rs. 1,200.',
      targetLanguage: 'en',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(captureHeaders[0]?.apikey).toBe('sb_publishable_client_key_01');
    expect(captureHeaders[0]?.Authorization).toBeUndefined();
    expect(captureHeaders[0]?.authorization).toBeUndefined();
  });
});
