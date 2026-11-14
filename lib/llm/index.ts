import type { LLMProvider } from './provider';
import { SupabaseEdgeLLMProvider } from './supabase';

export type { LLMProvider } from './provider';
export { SupabaseEdgeLLMProvider } from './supabase';
export {
  ExplainRequestSchema,
  ExplainResponseSchema,
  TargetLanguageSchema,
  type ExplainRequest,
  type ExplainResponse,
  type TargetLanguage,
} from './schema';

export function getLLMProvider(): LLMProvider {
  return new SupabaseEdgeLLMProvider();
}
