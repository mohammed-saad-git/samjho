import type { LanguageCode } from '../i18n/languages';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { getPreGeneratedSampleResponse } from '../samples';
import type { LLMProvider } from './provider';
import { ExplainServiceError, SupabaseEdgeLLMProvider } from './supabase';
import type { ExplainResponse } from './schema';

export type { LLMProvider } from './provider';
export { ExplainServiceError, SupabaseEdgeLLMProvider } from './supabase';
export {
  ExplainRequestSchema,
  ExplainResponseSchema,
  TargetLanguageSchema,
  type ExplainRequest,
  type ExplainResponse,
  type TargetLanguage,
} from './schema';

export interface ExecuteExplanationParams {
  redactedText: string;
  targetLanguage: LanguageCode;
  documentHint?: string;
  activeSampleId: string | null;
  hasModifiedRedactions: boolean;
  forceLive?: boolean;
  provider?: LLMProvider;
}

export type ExecuteExplanationOutcome =
  | {
      ok: true;
      explanation: ExplainResponse;
      explainError: null;
      errorCode?: null;
      resultSource: 'sample' | 'live';
      hasSentToServer: boolean;
    }
  | {
      ok: false;
      explanation: null;
      explainError: string;
      errorCode?: string | null;
      resultSource: 'live';
      hasSentToServer: false;
    };

export function getLLMProvider(): LLMProvider {
  return new SupabaseEdgeLLMProvider();
}

export async function executeExplanationRequest(
  params: ExecuteExplanationParams
): Promise<ExecuteExplanationOutcome> {
  if (params.activeSampleId && !params.hasModifiedRedactions && !params.forceLive) {
    const pregen = getPreGeneratedSampleResponse(params.activeSampleId, params.targetLanguage);
    if (pregen) {
      return {
        ok: true,
        explanation: pregen,
        explainError: null,
        resultSource: 'sample',
        hasSentToServer: false,
      };
    }
  }

  try {
    const provider = params.provider ?? getLLMProvider();
    const validated = await provider.explain({
      redactedText: params.redactedText,
      targetLanguage: params.targetLanguage,
      ...(params.documentHint ? { documentHint: params.documentHint } : {}),
    });
    return {
      ok: true,
      explanation: validated,
      explainError: null,
      resultSource: 'live',
      hasSentToServer: true,
    };
  } catch (err) {
    const strings = UI_TRANSLATIONS[params.targetLanguage];
    if (err instanceof ExplainServiceError) {
      const errorCodes = strings.errorByCode;
      const mapped =
        err.code && err.code in errorCodes
          ? errorCodes[err.code as keyof typeof errorCodes]
          : err.message;
      return {
        ok: false,
        explanation: null,
        explainError: mapped,
        errorCode: err.code ?? null,
        resultSource: 'live',
        hasSentToServer: false,
      };
    }

    const isNetworkError =
      err instanceof TypeError ||
      (err instanceof Error &&
        /failed to fetch|networkerror|load failed|fetch failed|network request failed/i.test(
          err.message
        ));
    const message = isNetworkError
      ? strings.networkErrorFallback
      : err instanceof Error
        ? err.message
        : strings.networkErrorFallback;
    return {
      ok: false,
      explanation: null,
      explainError: message,
      errorCode: null,
      resultSource: 'live',
      hasSentToServer: false,
    };
  }
}
