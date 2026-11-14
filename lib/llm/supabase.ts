import { getSupabaseFunctionConfig, type FrontendEnvInput } from '../env';
import { withRetry, type LLMProvider } from './provider';
import {
  ExplainRequestSchema,
  ExplainResponseSchema,
  type ExplainRequest,
  type ExplainResponse,
} from './schema';

class ClientRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface SupabaseEdgeProviderOptions {
  fetchFn?: typeof fetch;
  envOverride?: FrontendEnvInput;
  backoffMs?: number;
}

/**
 * Calls the deployed Supabase Edge Function (`supabase/functions/explain`)
 * with the Supabase anon key Bearer token and strictly redacted text only.
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
            Authorization: `Bearer ${config.supabaseAnonKey}`,
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
          const message =
            typeof body === 'object' &&
            body !== null &&
            'error' in body &&
            typeof (body as { error?: unknown }).error === 'string'
              ? (body as { error: string }).error
              : `Could not explain this document right now (HTTP ${response.status}).`;

          if (response.status >= 400 && response.status < 500) {
            throw new ClientRequestError(message, response.status);
          }
          throw new Error(message);
        }

        return ExplainResponseSchema.parse(body);
      },
      1,
      this.backoffMs
    ).catch((err) => {
      if (err instanceof ClientRequestError) {
        throw new Error(err.message);
      }
      throw err instanceof Error ? err : new Error('Unable to reach explanation service.');
    });
  }
}
