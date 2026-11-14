import sampleResponsesRaw from '../fixtures/sample-responses.json';
import { ExplainResponseSchema, type ExplainResponse, type TargetLanguage } from './llm/schema';

export type SampleId =
  'electricity-bill' | 'bank-loan-notice' | 'rental-agreement' | 'government-notice';

export interface SampleDocumentInfo {
  id: SampleId;
  title: string;
  subtitle: string;
  identifiersSummary: string;
  fileUrl: string;
  kind: 'pdf' | 'image';
  documentHint: string;
}

export const SAMPLE_DOCUMENTS: readonly SampleDocumentInfo[] = [
  {
    id: 'electricity-bill',
    title: 'Electricity bill with arrears',
    subtitle: 'PDF · Dakshin Bharat Power',
    identifiersSummary:
      'Contains name, consumer number, Aadhaar, mobile, email, UPI ID, and address.',
    fileUrl: '/samples/electricity-bill.pdf',
    kind: 'pdf',
    documentHint: 'Electricity bill',
  },
  {
    id: 'bank-loan-notice',
    title: 'Bank overdue loan notice',
    subtitle: 'PDF · Bharatiya Cooperative Bank',
    identifiersSummary:
      'Contains borrower name, loan account, PAN, date of birth, IFSC, mobile, and address.',
    fileUrl: '/samples/bank-loan-notice.pdf',
    kind: 'pdf',
    documentHint: 'Bank loan notice',
  },
  {
    id: 'rental-agreement',
    title: 'Rental agreement excerpt',
    subtitle: 'PDF · Residential Leave & License',
    identifiersSummary:
      'Contains two names, two Aadhaar numbers, PAN, passport, mobile, email, and address.',
    fileUrl: '/samples/rental-agreement.pdf',
    kind: 'pdf',
    documentHint: 'Rental agreement',
  },
  {
    id: 'government-notice',
    title: 'Scholarship notice (photo)',
    subtitle: 'PNG photo · On-device OCR',
    identifiersSummary:
      'Contains applicant name, application ID, Aadhaar, date of birth, mobile, bank account, IFSC, and address.',
    fileUrl: '/samples/government-notice.png',
    kind: 'image',
    documentHint: 'Government notice',
  },
];

export interface SampleResponsesEnvelope {
  _meta?: {
    valid?: boolean;
    generatedBy?: string;
    generatedAt?: string;
    reason?: string;
  };
  responses?: Record<string, Partial<Record<TargetLanguage, ExplainResponse>>>;
}

const SAMPLE_RESPONSES = sampleResponsesRaw as SampleResponsesEnvelope;

export function isSampleResponsesValid(
  envelope: SampleResponsesEnvelope = SAMPLE_RESPONSES
): boolean {
  return Boolean(
    envelope?._meta?.valid === true &&
    envelope?._meta?.generatedBy === 'supabase-edge-explain' &&
    envelope?.responses &&
    typeof envelope.responses === 'object'
  );
}

export function getPreGeneratedSampleResponse(
  sampleId: string,
  language: TargetLanguage,
  envelope: SampleResponsesEnvelope = SAMPLE_RESPONSES
): ExplainResponse | null {
  if (!isSampleResponsesValid(envelope)) {
    return null;
  }
  const candidate = envelope.responses?.[sampleId]?.[language];
  if (!candidate) {
    return null;
  }
  const parsed = ExplainResponseSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
