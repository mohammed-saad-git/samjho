import { z } from 'npm:zod';
import { detectPII, type PIICategory } from '../../../lib/detect/index.ts';

export const TargetLanguageSchema = z.enum(['en', 'hi', 'kn', 'ta', 'te']);

export const ExplainRequestSchema = z.object({
  redactedText: z
    .string()
    .trim()
    .min(20, 'Document text is too short to analyze.')
    .max(20000, 'Document text exceeds the 20,000 character maximum.'),
  targetLanguage: TargetLanguageSchema,
  documentHint: z.string().trim().max(80).optional(),
});

export const ExplainResponseSchema = z.object({
  documentType: z.string().min(1),
  summary: z.string().min(1),
  keyFacts: z.array(
    z.object({
      label: z.string().min(1),
      value: z.string().min(1),
    })
  ),
  deadlines: z.array(
    z.object({
      date: z.string().min(1),
      what: z.string().min(1),
    })
  ),
  amounts: z.array(
    z.object({
      value: z.string().min(1),
      what: z.string().min(1),
    })
  ),
  watchOuts: z.array(z.string().min(1)),
  nextSteps: z.array(z.string().min(1)),
  draftReply: z.string().min(1),
});

export type TargetLanguage = z.infer<typeof TargetLanguageSchema>;
export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;
export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;

export const EXPLAIN_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'documentType',
    'summary',
    'keyFacts',
    'deadlines',
    'amounts',
    'watchOuts',
    'nextSteps',
    'draftReply',
  ],
  properties: {
    documentType: { type: 'string' },
    summary: { type: 'string' },
    keyFacts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value'],
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
      },
    },
    deadlines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'what'],
        properties: {
          date: { type: 'string' },
          what: { type: 'string' },
        },
      },
    },
    amounts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['value', 'what'],
        properties: {
          value: { type: 'string' },
          what: { type: 'string' },
        },
      },
    },
    watchOuts: {
      type: 'array',
      items: { type: 'string' },
    },
    nextSteps: {
      type: 'array',
      items: { type: 'string' },
    },
    draftReply: { type: 'string' },
  },
} as const;

const LANGUAGE_LABELS: Record<TargetLanguage, { englishName: string; nativeName: string }> = {
  en: { englishName: 'English', nativeName: 'English' },
  hi: { englishName: 'Hindi', nativeName: 'हिन्दी' },
  kn: { englishName: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  ta: { englishName: 'Tamil', nativeName: 'தமிழ்' },
  te: { englishName: 'Telugu', nativeName: 'తెలుగు' },
};

const SERVER_BLOCKED_CATEGORIES = new Set<PIICategory>(['AADHAAR', 'PAN', 'PHONE', 'EMAIL']);
const MAX_REQUEST_BYTES = 64 * 1024;
const REQUIRED_EDGE_VARS = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'ALLOWED_ORIGIN'] as const;
const LOCAL_DEV_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export interface EdgeEnvConfig {
  geminiApiKey: string;
  geminiModel: string;
  allowedOrigins: string[];
  allowLocalhostInDev: boolean;
}

export type EnvGetter = (name: string) => string | undefined;

export interface ExplainHandlerDeps {
  getEnv?: EnvGetter;
  fetchFn?: typeof fetch;
  backoffMs?: number;
}

function defaultGetEnv(name: string): string | undefined {
  if (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function') {
    return Deno.env.get(name);
  }
  return undefined;
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

/**
 * Validates required Edge Function secrets at startup or request time and fails fast
 * with an explicit error naming every missing environment variable.
 */
export function validateEdgeEnv(getEnv: EnvGetter = defaultGetEnv): EdgeEnvConfig {
  const missing = REQUIRED_EDGE_VARS.filter((name) => {
    const val = getEnv(name);
    return !val || val.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase Edge Function environment variable(s): ${missing.join(', ')}. Set them with "supabase secrets set ${missing[0]}=<value>".`
    );
  }

  const allowedOrigins = (getEnv('ALLOWED_ORIGIN') ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter((item) => item.length > 0);

  if (allowedOrigins.length === 0) {
    throw new Error(
      'Missing required Supabase Edge Function environment variable(s): ALLOWED_ORIGIN. Set it with "supabase secrets set ALLOWED_ORIGIN=https://<your-app>.vercel.app".'
    );
  }

  const isLocalRuntime = !getEnv('DENO_DEPLOYMENT_ID') || getEnv('ENVIRONMENT') === 'development';

  return {
    geminiApiKey: getEnv('GEMINI_API_KEY')!.trim(),
    geminiModel: getEnv('GEMINI_MODEL')!.trim(),
    allowedOrigins,
    allowLocalhostInDev: isLocalRuntime,
  };
}

export function isOriginAllowed(origin: string, config: EdgeEnvConfig): boolean {
  const normalized = normalizeOrigin(origin);
  if (config.allowedOrigins.includes(normalized)) {
    return true;
  }
  if (config.allowLocalhostInDev && LOCAL_DEV_ORIGIN_RE.test(normalized)) {
    return true;
  }
  return false;
}

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'authorization, x-client-info, apikey, content-type';
  }
  return headers;
}

function jsonResponse(body: unknown, status: number, origin: string | null = null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...buildCorsHeaders(origin),
    },
  });
}

function buildSystemPrompt(): string {
  return [
    'You are Samjho, an accessibility assistant that explains official Indian paperwork (electricity bills, bank notices, rent agreements, government letters) in clear, calm, plain language.',
    'Rules you must follow strictly:',
    '1. Personal identifiers in the text have been replaced with bracketed tokens such as [PERSON_01], [AADHAAR_01], [PHONE_01], [ACCOUNT_01], [PAN_01], [ADDRESS_01].',
    '2. Keep EVERY redaction token like [PERSON_01] verbatim in Latin uppercase letters inside square brackets, even when writing in Hindi, Kannada, Tamil, or Telugu. Never translate, alter, or strip brackets from tokens.',
    '3. Never guess or invent missing numbers, dates, fees, or names. If part of the text is unclear or cut off, state explicitly that it is unclear in the document.',
    '4. Provide clear factual explanation and practical administrative next steps only. Do NOT give legal advice, medical advice, or financial investment advice.',
    '5. Output strictly valid JSON matching the requested schema.',
  ].join('\n');
}

function buildUserPrompt(request: ExplainRequest): string {
  const lang = LANGUAGE_LABELS[request.targetLanguage];
  const hintLine = request.documentHint ? `Document hint: ${request.documentHint}\n` : '';

  return [
    `Write every field of the JSON response in ${lang.englishName} (${lang.nativeName}), while keeping bracketed tokens like [PERSON_01] verbatim in Latin uppercase.`,
    hintLine,
    'Redacted document text:',
    '---',
    request.redactedText,
    '---',
  ]
    .filter(Boolean)
    .join('\n');
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 1,
  backoffMs = 800
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && backoffMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini request failed after retry');
}

async function callGeminiOnce(
  input: ExplainRequest,
  env: EdgeEnvConfig,
  fetchFn: typeof fetch
): Promise<ExplainResponse> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`;

  const response = await fetchFn(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.geminiApiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildSystemPrompt() }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: buildUserPrompt(input) }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseJsonSchema: EXPLAIN_RESPONSE_JSON_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API responded with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini API returned an empty response.');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new Error('Gemini API returned invalid JSON.');
  }

  return ExplainResponseSchema.parse(parsedJson);
}

/**
 * Handles CORS preflight and explanation requests for Samjho without logging payloads.
 */
export async function handleExplainRequest(
  req: Request,
  deps: ExplainHandlerDeps = {}
): Promise<Response> {
  let env: EdgeEnvConfig;
  try {
    env = validateEdgeEnv(deps.getEnv ?? defaultGetEnv);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server configuration error.';
    return jsonResponse({ error: message }, 500);
  }

  const requestOrigin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    if (!requestOrigin || !isOriginAllowed(requestOrigin, env)) {
      return jsonResponse({ error: 'Origin not allowed.' }, 403);
    }
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(normalizeOrigin(requestOrigin)),
    });
  }

  if (requestOrigin && !isOriginAllowed(requestOrigin, env)) {
    return jsonResponse({ error: 'Origin not allowed.' }, 403);
  }

  const allowedOriginHeader = requestOrigin ? normalizeOrigin(requestOrigin) : null;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405, allowedOriginHeader);
  }

  const contentLength = req.headers.get('Content-Length');
  if (contentLength && Number(contentLength) > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: 'Request payload is too large.' }, 413, allowedOriginHeader);
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return jsonResponse({ error: 'Failed to read request body.' }, 400, allowedOriginHeader);
  }

  if (rawBody.length > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: 'Request payload is too large.' }, 413, allowedOriginHeader);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400, allowedOriginHeader);
  }

  const parsed = ExplainRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request payload.' },
      400,
      allowedOriginHeader
    );
  }

  // Defense in depth: re-scan on the server using shared lib/detect and refuse
  // unredacted high-risk identifiers even if the browser layer was bypassed.
  const serverFindings = detectPII(parsed.data.redactedText);
  const blockedCategories = Array.from(
    new Set(
      serverFindings
        .filter((finding) => SERVER_BLOCKED_CATEGORIES.has(finding.category))
        .map((finding) => finding.category)
    )
  );

  if (blockedCategories.length > 0) {
    return jsonResponse(
      {
        error:
          'Unredacted personal identifier detected in payload. Remove Aadhaar, PAN, phone number, or email before sending.',
        blockedCategories,
      },
      422,
      allowedOriginHeader
    );
  }

  try {
    const explanation = await withRetry(
      () => callGeminiOnce(parsed.data, env, deps.fetchFn ?? fetch),
      1,
      deps.backoffMs ?? 800
    );
    return jsonResponse(explanation, 200, allowedOriginHeader);
  } catch {
    return jsonResponse(
      { error: 'Explanation service is temporarily unavailable. Please retry in a moment.' },
      502,
      allowedOriginHeader
    );
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  validateEdgeEnv(defaultGetEnv);
  Deno.serve((req: Request) => handleExplainRequest(req));
}
