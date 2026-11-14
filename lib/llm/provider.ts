import type { ExplainRequest, ExplainResponse } from './schema';

export interface LLMProvider {
  readonly name: string;
  explain(input: ExplainRequest): Promise<ExplainResponse>;
}

/**
 * Retries an async LLM call once with backoff on transient failure.
 */
export async function withRetry<T>(
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
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('LLM request failed after retry');
}
