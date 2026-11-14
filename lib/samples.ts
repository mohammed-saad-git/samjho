import sampleResponsesRaw from '../fixtures/sample-responses.json';
import type { TargetLanguage, ExplainResponse } from './llm/schema';

export interface SampleDocumentInfo {
  id: 'electricity-bill' | 'bank-loan-notice' | 'rental-agreement' | 'government-notice';
  title: string;
  subtitle: string;
  fileUrl: string;
  kind: 'pdf' | 'image';
  documentHint: string;
}

export const SAMPLE_DOCUMENTS: readonly SampleDocumentInfo[] = [
  {
    id: 'electricity-bill',
    title: 'Electricity bill with arrears',
    subtitle: 'PDF · Dakshin Bharat Power',
    fileUrl: '/samples/electricity-bill.pdf',
    kind: 'pdf',
    documentHint: 'Electricity bill',
  },
  {
    id: 'bank-loan-notice',
    title: 'Bank overdue loan notice',
    subtitle: 'PDF · Bharatiya Cooperative Bank',
    fileUrl: '/samples/bank-loan-notice.pdf',
    kind: 'pdf',
    documentHint: 'Bank loan notice',
  },
  {
    id: 'rental-agreement',
    title: 'Rental agreement excerpt',
    subtitle: 'PDF · Residential Leave & License',
    fileUrl: '/samples/rental-agreement.pdf',
    kind: 'pdf',
    documentHint: 'Rental agreement',
  },
  {
    id: 'government-notice',
    title: 'Scholarship notice (photo)',
    subtitle: 'PNG photo · On-device OCR',
    fileUrl: '/samples/government-notice.png',
    kind: 'image',
    documentHint: 'Government notice',
  },
];

type SampleResponseMap = Record<string, Record<TargetLanguage, ExplainResponse>>;

const SAMPLE_RESPONSES = sampleResponsesRaw as SampleResponseMap;

export function getPreGeneratedSampleResponse(
  sampleId: string,
  language: TargetLanguage
): ExplainResponse | null {
  const docEntry = SAMPLE_RESPONSES[sampleId];
  if (!docEntry) return null;
  return docEntry[language] ?? null;
}
