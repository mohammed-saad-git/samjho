export interface FrontendEnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  explainFunctionUrl: string;
}

export interface FrontendEnvInput {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

export type FrontendEnvStatus =
  { ok: true; config: FrontendEnvConfig } | { ok: false; missing: string[]; message: string };

/**
 * Reads public Supabase variables using static property access so Next.js
 * replaces NEXT_PUBLIC_* values inline inside browser bundles at build time.
 */
function readPublicEnv(override?: FrontendEnvInput): FrontendEnvInput {
  if (override) {
    return override;
  }
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/**
 * Validates required frontend environment variables and throws immediately
 * with a clear message naming every missing variable.
 */
export function validateFrontendEnv(override?: FrontendEnvInput): FrontendEnvConfig {
  const env = readPublicEnv(override);
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Missing required frontend environment variable(s): ${missing.join(', ')}. Add them to .env.local or Vercel Environment Variables (see SETUP.md).`
    );
  }

  const normalizedUrl = url!.replace(/\/+$/, '');
  if (!normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('http://')) {
    throw new Error(
      'Invalid NEXT_PUBLIC_SUPABASE_URL: must start with https:// or http:// (see SETUP.md).'
    );
  }

  return {
    supabaseUrl: normalizedUrl,
    supabaseAnonKey: anonKey!,
    explainFunctionUrl: `${normalizedUrl}/functions/v1/explain`,
  };
}

export function getSupabaseFunctionConfig(override?: FrontendEnvInput): FrontendEnvConfig {
  return validateFrontendEnv(override);
}

export function getFrontendEnvStatus(override?: FrontendEnvInput): FrontendEnvStatus {
  const env = readPublicEnv(override);
  const missing: string[] = [];
  if (!env.NEXT_PUBLIC_SUPABASE_URL?.trim()) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  try {
    return {
      ok: true,
      config: validateFrontendEnv(env),
    };
  } catch (err) {
    return {
      ok: false,
      missing,
      message:
        err instanceof Error
          ? err.message
          : 'Missing required frontend environment configuration (see SETUP.md).',
    };
  }
}
