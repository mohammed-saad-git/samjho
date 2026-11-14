import { getLanguageConfig } from '../i18n/languages';
import type { ExplainRequest } from './schema';

export function buildSystemPrompt(): string {
  return [
    'You are Samjho, an accessibility assistant that explains official Indian paperwork (electricity bills, bank notices, rent agreements, government letters) in clear, calm, plain language.',
    'Rules you must follow strictly:',
    '1. Personal identifiers in the text have been replaced with bracketed tokens such as [PERSON_01], [AADHAAR_01], [PHONE_01], [ACCOUNT_01], [PAN_01], [ADDRESS_01].',
    '2. Keep EVERY redaction token like [PERSON_01] verbatim in Latin uppercase letters inside square brackets, even when writing in Hindi, Kannada, Tamil, or Telugu. Never translate, alter, or strip brackets from tokens.',
    '3. Never guess or invent missing numbers, dates, fees, or names. If part of the text is unclear or cut off, state explicitly that it is unclear in the document.',
    '4. Provide clear factual explanation and practical administrative next steps only. Do NOT give legal advice, medical advice, or financial investment advice.',
    '5. Output strictly valid JSON matching the requested schema.',
  ].join('\n');
}

export function buildUserPrompt(request: ExplainRequest): string {
  const lang = getLanguageConfig(request.targetLanguage);
  const hintLine = request.documentHint ? `Document hint: ${request.documentHint}\n` : '';

  return [
    `Write every field of the JSON response in ${lang.englishName} (${lang.nativeName}), while keeping bracketed tokens like [PERSON_01] verbatim in Latin uppercase.`,
    hintLine,
    'Redacted document text:',
    '---',
    request.redactedText,
    '---',
  ]
    .filter(Boolean)
    .join('\n');
}
