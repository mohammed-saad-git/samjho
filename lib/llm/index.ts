import { GeminiLLMProvider } from './gemini';
import type { LLMProvider } from './provider';

export type { LLMProvider } from './provider';
export {
  ExplainRequestSchema,
  ExplainResponseSchema,
  TargetLanguageSchema,
  type ExplainRequest,
  type ExplainResponse,
  type TargetLanguage,
} from './schema';

export function getLLMProvider(): LLMProvider {
  return new GeminiLLMProvider();
}
