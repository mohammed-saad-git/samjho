import fs from 'node:fs';
import path from 'node:path';
import {
  detectPII,
  generateVerhoeffChecksum,
  redactText,
  SessionVault,
} from '../lib/detect/index.ts';
import { getSupabaseFunctionConfig } from '../lib/env';
import { ExplainResponseSchema, type TargetLanguage } from '../lib/llm/schema';
import { SAMPLE_DOCUMENTS } from '../lib/samples';

const TOKEN_PATTERN = /\[[A-Z][A-Z0-9_]*_\d{1,3}\]/g;
const KANNADA_SCRIPT_RE = /[\u0C80-\u0CFF]{3,}/;
const HIGH_RISK_CATEGORIES = new Set(['AADHAAR', 'PAN', 'PHONE', 'EMAIL']);

function loadDotEnvLocal(): void {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envLocalPath)) {
    return;
  }
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

function diagnoseErrorCode(code: string | undefined, status: number): string {
  switch (code) {
    case 'MODEL_UNAVAILABLE':
      return "MODEL_UNAVAILABLE: check GEMINI_MODEL against Google's current model list";
    case 'AUTH_FAILED':
      return status === 401
        ? 'AUTH_FAILED: verify NEXT_PUBLIC_SUPABASE_ANON_KEY matches SUPABASE_PUBLISHABLE_KEYS on Supabase'
        : 'AUTH_FAILED: verify GEMINI_API_KEY in Supabase Edge Function secrets';
    case 'RATE_LIMITED':
      return 'RATE_LIMITED: Gemini API quota/rate limit reached; wait a minute and retry';
    case 'TIMEOUT':
      return 'TIMEOUT: upstream Gemini call exceeded the 25s request budget';
    case 'UPSTREAM_ERROR':
      return 'UPSTREAM_ERROR: Gemini upstream returned a 5xx or network error';
    case 'BAD_MODEL_OUTPUT':
      return 'BAD_MODEL_OUTPUT: model returned blocked, malformed, or schema-invalid JSON';
    case 'ORIGIN_NOT_ALLOWED':
      return 'ORIGIN_NOT_ALLOWED: check ALLOWED_ORIGIN in Supabase Edge Function secrets';
    case 'SERVER_MISCONFIGURED':
      return 'SERVER_MISCONFIGURED: check GEMINI_API_KEY, GEMINI_MODEL, ALLOWED_ORIGIN secrets on Supabase';
    default:
      return `${code ?? `HTTP_${status}`}: live Edge Function call failed (HTTP ${status})`;
  }
}

async function runNegativeChecks(
  explainUrl: string,
  anonKey: string,
  smokeOrigin?: string
): Promise<void> {
  const unredactedAadhaar = generateVerhoeffChecksum('49287163504');
  const headers422: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey,
  };
  if (smokeOrigin) {
    headers422.Origin = smokeOrigin;
  }

  const start422 = Date.now();
  const res422 = await fetch(explainUrl, {
    method: 'POST',
    headers: headers422,
    body: JSON.stringify({
      redactedText: `Electricity bill for [PERSON_01]. Unredacted Aadhaar ${unredactedAadhaar}. Amount due Rs. 6,970.00.`,
      targetLanguage: 'en',
      documentHint: 'Electricity bill',
    }),
  });
  const ms422 = Date.now() - start422;
  if (res422.status !== 422) {
    throw new Error(
      `Negative check failed: expected HTTP 422 for unredacted Aadhaar, got ${res422.status}`
    );
  }
  console.log(`[PASS] Negative check (unredacted Aadhaar -> HTTP 422) latency=${ms422}ms`);

  const headers401: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: 'sb_publishable_invalid_key_for_smoke_test',
  };
  if (smokeOrigin) {
    headers401.Origin = smokeOrigin;
  }

  const start401 = Date.now();
  const res401 = await fetch(explainUrl, {
    method: 'POST',
    headers: headers401,
    body: JSON.stringify({
      redactedText: 'Electricity bill for [PERSON_01]. Amount due Rs. 6,970.00.',
      targetLanguage: 'en',
    }),
  });
  const ms401 = Date.now() - start401;
  if (res401.status !== 401) {
    throw new Error(
      `Negative check failed: expected HTTP 401 for invalid apikey, got ${res401.status}`
    );
  }
  console.log(`[PASS] Negative check (invalid apikey -> HTTP 401) latency=${ms401}ms`);

  const start403 = Date.now();
  const res403 = await fetch(explainUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Origin: 'https://disallowed-origin.example.com',
    },
    body: JSON.stringify({
      redactedText: 'Electricity bill for [PERSON_01]. Amount due Rs. 6,970.00.',
      targetLanguage: 'en',
    }),
  });
  const ms403 = Date.now() - start403;
  if (res403.status !== 403) {
    throw new Error(
      `Negative check failed: expected HTTP 403 for disallowed Origin, got ${res403.status}`
    );
  }
  console.log(`[PASS] Negative check (disallowed Origin -> HTTP 403) latency=${ms403}ms`);
}

async function runSampleCheck(
  explainUrl: string,
  anonKey: string,
  sampleId: string,
  documentHint: string,
  lang: TargetLanguage,
  smokeOrigin?: string
): Promise<void> {
  const fixturePath = path.resolve(process.cwd(), 'fixtures/samples', `${sampleId}.txt`);
  const originalText = fs.readFileSync(fixturePath, 'utf8');

  const vault = new SessionVault();
  const findings = detectPII(originalText, vault);
  const redactedText = redactText(originalText, findings);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey,
  };
  if (smokeOrigin) {
    headers.Origin = smokeOrigin;
  }

  const startedAt = Date.now();
  const response = await fetch(explainUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      redactedText,
      targetLanguage: lang,
      documentHint,
    }),
  });
  const latencyMs = Date.now() - startedAt;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`HTTP_${response.status}: Edge Function returned non-JSON body`);
  }

  if (response.status !== 200) {
    const code =
      typeof body === 'object' && body !== null && 'code' in body
        ? String((body as { code?: unknown }).code)
        : undefined;
    throw new Error(diagnoseErrorCode(code, response.status));
  }

  const parsed = ExplainResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`BAD_MODEL_OUTPUT: schema validation failed (${parsed.error.message})`);
  }

  if (!parsed.data.summary.trim()) {
    throw new Error('BAD_MODEL_OUTPUT: summary is empty');
  }

  if (lang === 'kn' && !KANNADA_SCRIPT_RE.test(parsed.data.summary)) {
    throw new Error('BAD_MODEL_OUTPUT: Kannada response summary does not contain Kannada script');
  }

  const serialized = JSON.stringify(parsed.data);

  for (const entry of vault.entries()) {
    const rawVal = entry.value.trim();
    if (rawVal.length >= 4 && serialized.toLowerCase().includes(rawVal.toLowerCase())) {
      throw new Error(`BAD_MODEL_OUTPUT: raw identifier for ${entry.token} leaked in output`);
    }
  }

  const leakedHighPii = detectPII(serialized).filter((f) => HIGH_RISK_CATEGORIES.has(f.category));
  if (leakedHighPii.length > 0) {
    throw new Error(
      `BAD_MODEL_OUTPUT: high-risk PII detected in model output (${leakedHighPii.map((f) => f.category).join(', ')})`
    );
  }

  const outputTokens = serialized.match(TOKEN_PATTERN) ?? [];
  for (const token of outputTokens) {
    if (!vault.hasToken(token)) {
      throw new Error(`BAD_MODEL_OUTPUT: model hallucinated unknown token ${token}`);
    }
  }

  console.log(
    `[PASS] sample=${sampleId} lang=${lang} status=200 latency=${latencyMs}ms tokens=${outputTokens.length}`
  );
}

async function main(): Promise<void> {
  loadDotEnvLocal();
  const config = getSupabaseFunctionConfig();
  const smokeOrigin = process.env.SMOKE_ORIGIN?.trim() || undefined;

  console.log(`Target Edge Function: ${config.explainFunctionUrl}`);

  await runNegativeChecks(config.explainFunctionUrl, config.supabaseAnonKey, smokeOrigin);

  const languages: TargetLanguage[] = ['en', 'kn'];
  for (const sample of SAMPLE_DOCUMENTS) {
    for (const lang of languages) {
      await runSampleCheck(
        config.explainFunctionUrl,
        config.supabaseAnonKey,
        sample.id,
        sample.documentHint,
        lang,
        smokeOrigin
      );
    }
  }

  console.log('All live smoke checks passed.');
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[FAIL] ${message}`);
  process.exit(1);
});
