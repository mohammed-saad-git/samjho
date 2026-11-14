import { NextResponse } from 'next/server';
import { detectPII, type PIICategory } from '@/lib/detect';
import { ExplainRequestSchema, getLLMProvider } from '@/lib/llm';

const BLOCKED_SERVER_CATEGORIES: ReadonlySet<PIICategory> = new Set([
  'AADHAAR',
  'PAN',
  'PHONE',
  'EMAIL',
]);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipRateLimits = new Map<string, RateLimitEntry>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  // Best-effort cleanup to prevent unbounded growth in long-lived instances
  if (ipRateLimits.size > 1000) {
    for (const [key, entry] of ipRateLimits.entries()) {
      if (entry.resetAt <= now) {
        ipRateLimits.delete(key);
      }
    }
  }

  const existing = ipRateLimits.get(ip);
  if (!existing || existing.resetAt <= now) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  existing.count += 1;
  return true;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute before trying again.' },
      { status: 429 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = ExplainRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Invalid request payload.',
      },
      { status: 400 }
    );
  }

  // Defense-in-depth: re-run detection server-side and reject if critical PII was left unredacted.
  // Never log request bodies or detected values.
  const serverFindings = detectPII(parsed.data.redactedText);
  const leakedCategories = Array.from(
    new Set(
      serverFindings
        .filter((finding) => BLOCKED_SERVER_CATEGORIES.has(finding.category))
        .map((finding) => finding.category)
    )
  );

  if (leakedCategories.length > 0) {
    return NextResponse.json(
      {
        error:
          'Server privacy guard blocked this request because unredacted personal identifiers were detected.',
        blockedCategories: leakedCategories,
      },
      { status: 422 }
    );
  }

  try {
    const provider = getLLMProvider();
    const explanation = await provider.explain(parsed.data);
    return NextResponse.json(explanation, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const isConfigError =
      err instanceof Error && err.message.includes('GEMINI_API_KEY is not configured');

    return NextResponse.json(
      {
        error: isConfigError
          ? 'Live AI explanation is not configured on this server yet. You can still inspect the local redaction and try the built-in sample documents.'
          : 'The explanation service could not complete your request right now. Please try again.',
      },
      { status: isConfigError ? 503 : 502 }
    );
  }
}
