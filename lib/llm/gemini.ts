import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { withRetry, type LLMProvider } from './provider';
import {
  EXPLAIN_RESPONSE_JSON_SCHEMA,
  ExplainResponseSchema,
  type ExplainRequest,
  type ExplainResponse,
} from './schema';

const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export class GeminiLLMProvider implements LLMProvider {
  readonly name = 'gemini';
  private readonly apiKey: string;
  private readonly modelId: string;

  constructor(apiKey?: string, modelId?: string) {
    const resolvedKey = apiKey ?? process.env.GEMINI_API_KEY;
    if (!resolvedKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }
    this.apiKey = resolvedKey;
    this.modelId = modelId ?? process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  }

  async explain(input: ExplainRequest): Promise<ExplainResponse> {
    const client = new GoogleGenAI({ apiKey: this.apiKey });

    return withRetry(async () => {
      const response = await client.models.generateContent({
        model: this.modelId,
        contents: buildUserPrompt(input),
        config: {
          systemInstruction: buildSystemPrompt(),
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseJsonSchema: EXPLAIN_RESPONSE_JSON_SCHEMA,
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Model returned an empty response.');
      }

      const parsedJson: unknown = JSON.parse(rawText);
      return ExplainResponseSchema.parse(parsedJson);
    });
  }
}
