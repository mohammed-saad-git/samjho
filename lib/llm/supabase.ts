import { getSupabaseFunctionConfig, type FrontendEnvInput } from '../env';
import { withRetry, type LLMProvider } from './provider';
import {
  ExplainRequestSchema,
  ExplainResponseSchema,
  type ExplainRequest,
  type ExplainResponse,
} from './schema';

export class ExplainServiceError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface SupabaseEdgeProviderOptions {
  fetchFn?: typeof fetch;
  envOverride?: FrontendEnvInput;
  backoffMs?: number;
}

/**
 * Calls the deployed Supabase Edge Function (`supabase/functions/explain`)
 * with the Supabase publishable key in the apikey header only and strictly redacted text.
 */
export class SupabaseEdgeLLMProvider implements LLMProvider {
  readonly name = 'supabase-edge-explain';
  private readonly fetchFn: typeof fetch;
  private readonly envOverride?: FrontendEnvInput;
  private readonly backoffMs: number;

  constructor(options: SupabaseEdgeProviderOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
    this.envOverride = options.envOverride;
    this.backoffMs = options.backoffMs ?? 800;
  }

  async explain(input: ExplainRequest): Promise<ExplainResponse> {
    const validatedInput = ExplainRequestSchema.parse(input);
    const config = getSupabaseFunctionConfig(this.envOverride);

    return withRetry(
      async () => {
        const response = await this.fetchFn(config.explainFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: config.supabaseAnonKey,
          },
          body: JSON.stringify(validatedInput),
        });

        let body: unknown;
        try {
          body = await response.json();
        } catch {
          throw new Error(
            `Explanation backend returned invalid response (HTTP ${response.status}).`
          );
        }

        if (!response.ok) {
          const errorObj =
            typeof body === 'object' && body !== null
              ? (body as { error?: unknown; code?: unknown })
              : {};
          const message =
            typeof errorObj.error === 'string'
              ? errorObj.error
              : `Could not explain this document right now (HTTP ${response.status}).`;
          const code = typeof errorObj.code === 'string' ? errorObj.code : undefined;
          throw new ExplainServiceError(message, response.status, code);
        }

        return ExplainResponseSchema.parse(body);
      },
      1,
      this.backoffMs,
      (err) => !(err instanceof ExplainServiceError)
    ).catch((err) => {
      if (err instanceof ExplainServiceError) {
        throw err;
      }
      throw err instanceof Error ? err : new Error('Unable to reach explanation service.');
    });
  }
}
