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

export const EXPLAIN_RESPONSE_SCHEMA = {
  type: 'OBJECT',
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
    documentType: { type: 'STRING' },
    summary: { type: 'STRING' },
    keyFacts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['label', 'value'],
        properties: {
          label: { type: 'STRING' },
          value: { type: 'STRING' },
        },
      },
    },
    deadlines: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['date', 'what'],
        properties: {
          date: { type: 'STRING' },
          what: { type: 'STRING' },
        },
      },
    },
    amounts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['value', 'what'],
        properties: {
          value: { type: 'STRING' },
          what: { type: 'STRING' },
        },
      },
    },
    watchOuts: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    nextSteps: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    draftReply: { type: 'STRING' },
  },
} as const;

export type ExplainErrorCode =
  | 'RATE_LIMITED'
  | 'MODEL_UNAVAILABLE'
  | 'AUTH_FAILED'
  | 'UPSTREAM_ERROR'
  | 'TIMEOUT'
  | 'BAD_MODEL_OUTPUT'
  | 'INVALID_REQUEST'
  | 'ORIGIN_NOT_ALLOWED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNREDACTED_PII'
  | 'SERVER_MISCONFIGURED';

class UpstreamExplainError extends Error {
  readonly code: ExplainErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(code: ExplainErrorCode, status: number, retryable: boolean, message: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export interface ExplainLogEntry {
  status: number;
  latencyMs: number;
  inputLength: number;
  errorCode: ExplainErrorCode | null;
}

const LANGUAGE_LABELS: Record<TargetLanguage, { englishName: string; nativeName: string }> = {
  en: { englishName: 'English', nativeName: 'English' },
  hi: { englishName: 'Hindi', nativeName: 'हिन्दी' },
  kn: { englishName: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  ta: { englishName: 'Tamil', nativeName: 'தமிழ்' },
  te: { englishName: 'Telugu', nativeName: 'తెలుగు' },
};

const SERVER_BLOCKED_CATEGORIES = new Set<PIICategory>(['AADHAAR', 'PAN', 'PHONE', 'EMAIL']);
const MAX_REQUEST_BYTES = 64 * 1024;
const GEMINI_TIMEOUT_MS = 25_000;
const LOCAL_DEV_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const DEFAULT_RATE_LIMIT_MAX = 30;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

export interface EdgeEnvConfig {
  geminiApiKey: string;
  geminiModel: string;
  allowedOrigins: string[];
  allowLocalhostInDev: boolean;
  publishableKeys: string[];
}

export type EnvGetter = (name: string) => string | undefined;

export interface ExplainHandlerDeps {
  getEnv?: EnvGetter;
  fetchFn?: typeof fetch;
  backoffMs?: number;
  timeoutMs?: number;
  logger?: (entry: ExplainLogEntry) => void;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
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
 * Parses Supabase's auto-injected SUPABASE_PUBLISHABLE_KEYS env value,
 * accepting JSON objects (e.g. {"default":"sb_publishable_..."}), JSON arrays,
 * or comma-separated strings.
 */
export function parsePublishableKeys(raw: string | undefined): string[] {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) {
    return [];
  }

  const collected: string[] = [];
  const collectFromUnknown = (value: unknown): void => {
    if (typeof value === 'string') {
      for (const part of value.split(',')) {
        const clean = part.trim();
        if (clean) collected.push(clean);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        collectFromUnknown(item);
      }
      return;
    }
    if (typeof value === 'object' && value !== null) {
      for (const val of Object.values(value)) {
        collectFromUnknown(val);
      }
    }
  };

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      collectFromUnknown(JSON.parse(trimmed));
      return Array.from(new Set(collected));
    } catch {
      // Fall through to comma-separated parsing if JSON is malformed.
    }
  }

  collectFromUnknown(trimmed);
  return Array.from(new Set(collected));
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number,
  now = Date.now()
): boolean {
  if (rateLimitStore.size > 500) {
    for (const [key, bucket] of rateLimitStore.entries()) {
      if (bucket.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }

  const existing = rateLimitStore.get(ip);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  existing.count += 1;
  return existing.count <= maxRequests;
}

/**
 * Validates required Edge Function secrets at startup or request time and fails fast
 * with an explicit error naming every missing environment variable (without echoing values).
 */
export function validateEdgeEnv(getEnv: EnvGetter = defaultGetEnv): EdgeEnvConfig {
  const missing: string[] = [];
  const geminiApiKey = getEnv('GEMINI_API_KEY')?.trim() ?? '';
  const geminiModel = getEnv('GEMINI_MODEL')?.trim() ?? '';
  const allowedOrigins = (getEnv('ALLOWED_ORIGIN') ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter((item) => item.length > 0);
  const publishableKeys = parsePublishableKeys(getEnv('SUPABASE_PUBLISHABLE_KEYS'));

  if (!geminiApiKey) missing.push('GEMINI_API_KEY');
  if (!geminiModel) missing.push('GEMINI_MODEL');
  if (allowedOrigins.length === 0) missing.push('ALLOWED_ORIGIN');
  if (publishableKeys.length === 0) missing.push('SUPABASE_PUBLISHABLE_KEYS');

  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase Edge Function environment variable(s): ${missing.join(', ')}. Set them with "npx supabase secrets set --env-file supabase/functions/.env" (SUPABASE_PUBLISHABLE_KEYS is injected automatically by Supabase).`
    );
  }

  return {
    geminiApiKey,
    geminiModel,
    allowedOrigins,
    allowLocalhostInDev: getEnv('ENVIRONMENT') === 'development',
    publishableKeys,
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
  shouldRetry: (error: unknown) => boolean,
  maxRetries = 1,
  backoffMs = 800
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && shouldRetry(error)) {
        if (backoffMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
        }
        continue;
      }
      break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini request failed after retry');
}

function buildThinkingConfig(model: string): Record<string, unknown> {
  if (/^gemini-2\.5/i.test(model.trim())) {
    return { thinkingBudget: 0 };
  }
  return { thinkingLevel: 'minimal' };
}

function parseAndRepairModelJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {
    let repaired = rawText.trim();
    repaired = repaired
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const firstBrace = repaired.indexOf('{');
    const lastBrace = repaired.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      repaired = repaired.slice(firstBrace, lastBrace + 1);
    }
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(repaired);
    } catch {
      throw new UpstreamExplainError(
        'BAD_MODEL_OUTPUT',
        502,
        false,
        'Model returned malformed JSON.'
      );
    }
  }
}

const SESSION_TOKEN_PATTERN = /\[[A-Z][A-Z0-9_]*_\d{1,3}\]/g;

function sanitizeModelTokens(data: ExplainResponse, redactedInput: string): ExplainResponse {
  const allowedTokens = new Set<string>(redactedInput.match(SESSION_TOKEN_PATTERN) ?? []);
  const scrub = (value: string): string =>
    value.replace(SESSION_TOKEN_PATTERN, (token) =>
      allowedTokens.has(token) ? token : '[redacted]'
    );

  return {
    documentType: scrub(data.documentType),
    summary: scrub(data.summary),
    keyFacts: data.keyFacts.map((fact) => ({
      label: scrub(fact.label),
      value: scrub(fact.value),
    })),
    deadlines: data.deadlines.map((deadline) => ({
      date: scrub(deadline.date),
      what: scrub(deadline.what),
    })),
    amounts: data.amounts.map((amount) => ({
      value: scrub(amount.value),
      what: scrub(amount.what),
    })),
    watchOuts: data.watchOuts.map(scrub),
    nextSteps: data.nextSteps.map(scrub),
    draftReply: scrub(data.draftReply),
  };
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
        thought?: boolean;
      }>;
    };
  }>;
}

async function callGeminiOnce(
  input: ExplainRequest,
  env: EdgeEnvConfig,
  fetchFn: typeof fetch,
  timeoutMs: number
): Promise<ExplainResponse> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchFn(endpoint, {
      method: 'POST',
      signal: controller.signal,
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
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: EXPLAIN_RESPONSE_SCHEMA,
          thinkingConfig: buildThinkingConfig(env.geminiModel),
        },
      }),
    });
  } catch (err) {
    if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
      throw new UpstreamExplainError(
        'TIMEOUT',
        504,
        true,
        'The explanation request timed out. Please try again.'
      );
    }
    throw new UpstreamExplainError(
      'UPSTREAM_ERROR',
      502,
      true,
      'Failed to reach the explanation service. Please try again.'
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new UpstreamExplainError(
        'RATE_LIMITED',
        429,
        true,
        'The service is busy. Try again in a minute.'
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new UpstreamExplainError(
        'AUTH_FAILED',
        502,
        false,
        'Upstream model authentication failed.'
      );
    }
    if (response.status === 404 || response.status === 400) {
      throw new UpstreamExplainError(
        'MODEL_UNAVAILABLE',
        502,
        false,
        'Configured model is unavailable.'
      );
    }
    if (response.status >= 500) {
      throw new UpstreamExplainError(
        'UPSTREAM_ERROR',
        502,
        true,
        'Explanation service is temporarily unavailable. Please retry in a moment.'
      );
    }
    throw new UpstreamExplainError(
      'UPSTREAM_ERROR',
      502,
      false,
      'Explanation service encountered an upstream error. Please try again.'
    );
  }

  let payload: GeminiGenerateContentResponse;
  try {
    payload = (await response.json()) as GeminiGenerateContentResponse;
  } catch {
    throw new UpstreamExplainError(
      'BAD_MODEL_OUTPUT',
      502,
      false,
      'Model returned an unreadable response.'
    );
  }

  const candidate = payload.candidates?.[0];
  if (!candidate) {
    throw new UpstreamExplainError(
      'BAD_MODEL_OUTPUT',
      502,
      false,
      'Model returned no response candidates.'
    );
  }

  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    throw new UpstreamExplainError(
      'BAD_MODEL_OUTPUT',
      502,
      false,
      `Model stopped before completing the explanation (${candidate.finishReason}).`
    );
  }

  const parts = candidate.content?.parts ?? [];
  const rawText = parts
    .filter((part) => part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!rawText) {
    throw new UpstreamExplainError('BAD_MODEL_OUTPUT', 502, false, 'Model returned empty text.');
  }

  const parsedJson = parseAndRepairModelJson(rawText);
  const validated = ExplainResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new UpstreamExplainError(
      'BAD_MODEL_OUTPUT',
      502,
      false,
      'Model output failed response schema validation.'
    );
  }

  return sanitizeModelTokens(validated.data, input.redactedText);
}

/**
 * Handles CORS preflight and explanation requests for Samjho without logging payloads or secrets.
 */
export async function handleExplainRequest(
  req: Request,
  deps: ExplainHandlerDeps = {}
): Promise<Response> {
  const startedAt = Date.now();
  const log =
    deps.logger ??
    ((entry: ExplainLogEntry) => {
      console.info(JSON.stringify(entry));
    });

  const emit = (
    body: unknown,
    status: number,
    origin: string | null,
    inputLength: number,
    errorCode: ExplainErrorCode | null
  ): Response => {
    log({
      status,
      latencyMs: Date.now() - startedAt,
      inputLength,
      errorCode,
    });
    return jsonResponse(body, status, origin);
  };

  let env: EdgeEnvConfig;
  try {
    env = validateEdgeEnv(deps.getEnv ?? defaultGetEnv);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server configuration error.';
    return emit(
      { error: message, code: 'SERVER_MISCONFIGURED' },
      500,
      null,
      0,
      'SERVER_MISCONFIGURED'
    );
  }

  const requestOrigin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    if (!requestOrigin || !isOriginAllowed(requestOrigin, env)) {
      return emit(
        { error: 'Origin not allowed.', code: 'ORIGIN_NOT_ALLOWED' },
        403,
        null,
        0,
        'ORIGIN_NOT_ALLOWED'
      );
    }
    log({
      status: 204,
      latencyMs: Date.now() - startedAt,
      inputLength: 0,
      errorCode: null,
    });
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(normalizeOrigin(requestOrigin)),
    });
  }

  if (requestOrigin && !isOriginAllowed(requestOrigin, env)) {
    return emit(
      { error: 'Origin not allowed.', code: 'ORIGIN_NOT_ALLOWED' },
      403,
      null,
      0,
      'ORIGIN_NOT_ALLOWED'
    );
  }

  const allowedOriginHeader = requestOrigin ? normalizeOrigin(requestOrigin) : null;

  if (req.method !== 'POST') {
    return emit(
      { error: 'Method not allowed.', code: 'INVALID_REQUEST' },
      405,
      allowedOriginHeader,
      0,
      'INVALID_REQUEST'
    );
  }

  const apiKey = req.headers.get('apikey')?.trim() ?? '';
  const authHeader = req.headers.get('authorization')?.trim() ?? '';
  if (!apiKey || !env.publishableKeys.includes(apiKey) || authHeader.includes('sb_publishable_')) {
    return emit(
      { error: 'Invalid or missing API key.', code: 'AUTH_FAILED' },
      401,
      allowedOriginHeader,
      0,
      'AUTH_FAILED'
    );
  }

  const clientIp = getClientIp(req);
  const maxRequests = deps.rateLimitMax ?? DEFAULT_RATE_LIMIT_MAX;
  const windowMs = deps.rateLimitWindowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
  if (!checkRateLimit(clientIp, maxRequests, windowMs)) {
    return emit(
      { error: 'The service is busy. Try again in a minute.', code: 'RATE_LIMITED' },
      429,
      allowedOriginHeader,
      0,
      'RATE_LIMITED'
    );
  }

  const contentLength = req.headers.get('Content-Length');
  if (contentLength && Number(contentLength) > MAX_REQUEST_BYTES) {
    return emit(
      { error: 'Request payload is too large.', code: 'PAYLOAD_TOO_LARGE' },
      413,
      allowedOriginHeader,
      Number(contentLength),
      'PAYLOAD_TOO_LARGE'
    );
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return emit(
      { error: 'Failed to read request body.', code: 'INVALID_REQUEST' },
      400,
      allowedOriginHeader,
      0,
      'INVALID_REQUEST'
    );
  }

  if (rawBody.length > MAX_REQUEST_BYTES) {
    return emit(
      { error: 'Request payload is too large.', code: 'PAYLOAD_TOO_LARGE' },
      413,
      allowedOriginHeader,
      rawBody.length,
      'PAYLOAD_TOO_LARGE'
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return emit(
      { error: 'Invalid JSON request body.', code: 'INVALID_REQUEST' },
      400,
      allowedOriginHeader,
      rawBody.length,
      'INVALID_REQUEST'
    );
  }

  const parsed = ExplainRequestSchema.safeParse(body);
  if (!parsed.success) {
    return emit(
      {
        error: parsed.error.issues[0]?.message ?? 'Invalid request payload.',
        code: 'INVALID_REQUEST',
      },
      400,
      allowedOriginHeader,
      rawBody.length,
      'INVALID_REQUEST'
    );
  }

  const inputLength = parsed.data.redactedText.length;

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
    return emit(
      {
        error:
          'Unredacted personal identifier detected in payload. Remove Aadhaar, PAN, phone number, or email before sending.',
        code: 'UNREDACTED_PII',
        blockedCategories,
      },
      422,
      allowedOriginHeader,
      inputLength,
      'UNREDACTED_PII'
    );
  }

  const timeoutMs = deps.timeoutMs ?? GEMINI_TIMEOUT_MS;

  try {
    const explanation = await withRetry(
      () => callGeminiOnce(parsed.data, env, deps.fetchFn ?? fetch, timeoutMs),
      (err) => err instanceof UpstreamExplainError && err.retryable,
      1,
      deps.backoffMs ?? 800
    );
    return emit(explanation, 200, allowedOriginHeader, inputLength, null);
  } catch (err) {
    if (err instanceof UpstreamExplainError) {
      return emit(
        { error: err.message, code: err.code },
        err.status,
        allowedOriginHeader,
        inputLength,
        err.code
      );
    }
    return emit(
      {
        error: 'Explanation service is temporarily unavailable. Please retry in a moment.',
        code: 'UPSTREAM_ERROR',
      },
      502,
      allowedOriginHeader,
      inputLength,
      'UPSTREAM_ERROR'
    );
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  validateEdgeEnv(defaultGetEnv);
  Deno.serve((req: Request) => handleExplainRequest(req));
}
