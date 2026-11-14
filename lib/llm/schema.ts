import { z } from 'zod';

export const TargetLanguageSchema = z.enum(['en', 'hi', 'kn', 'ta', 'te']);

export const ExplainRequestSchema = z.object({
  redactedText: z
    .string()
    .trim()
    .min(20, 'Document text is too short to analyze.')
    .max(20000, 'Document text exceeds the 20,000 character maximum.'),
  targetLanguage: TargetLanguageSchema,
  documentHint: z.string().trim().max(80).optional(),
});

export const KeyFactSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const DeadlineSchema = z.object({
  date: z.string().min(1),
  what: z.string().min(1),
});

export const AmountSchema = z.object({
  value: z.string().min(1),
  what: z.string().min(1),
});

export const ExplainResponseSchema = z.object({
  documentType: z.string().min(1),
  summary: z.string().min(1),
  keyFacts: z.array(KeyFactSchema),
  deadlines: z.array(DeadlineSchema),
  amounts: z.array(AmountSchema),
  watchOuts: z.array(z.string().min(1)),
  nextSteps: z.array(z.string().min(1)),
  draftReply: z.string().min(1),
});

export type TargetLanguage = z.infer<typeof TargetLanguageSchema>;
export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;
export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;

export const EXPLAIN_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'documentType',
    'summary',
    'keyFacts',
    'deadlines',
    'amounts',
    'watchOuts',
    'nextSteps',
    'draftReply',
  ],
  properties: {
    documentType: { type: 'string' },
    summary: { type: 'string' },
    keyFacts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value'],
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
      },
    },
    deadlines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'what'],
        properties: {
          date: { type: 'string' },
          what: { type: 'string' },
        },
      },
    },
    amounts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['value', 'what'],
        properties: {
          value: { type: 'string' },
          what: { type: 'string' },
        },
      },
    },
    watchOuts: {
      type: 'array',
      items: { type: 'string' },
    },
    nextSteps: {
      type: 'array',
      items: { type: 'string' },
    },
    draftReply: { type: 'string' },
  },
} as const;
