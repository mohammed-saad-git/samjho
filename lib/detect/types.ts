export type PIICategory =
  | 'AADHAAR'
  | 'PAN'
  | 'PHONE'
  | 'EMAIL'
  | 'UPI'
  | 'IFSC'
  | 'PASSPORT'
  | 'DOB'
  | 'ACCOUNT'
  | 'ADDRESS'
  | 'PERSON'
  | 'REDACTED';

export type Severity = 'high' | 'medium' | 'low';

export interface CandidateMatch {
  category: PIICategory;
  start: number;
  end: number;
  text: string;
  confidence: number;
  severity: Severity;
  reason?: string;
}

export interface Finding extends CandidateMatch {
  id: string;
  token: string;
  manual?: boolean;
}

export interface CategoryScoreDetail {
  category: PIICategory;
  count: number;
  deduction: number;
  cap: number;
}

export interface PrivacyScoreReport {
  score: number;
  totalDeduction: number;
  quasiIdentifierPenalty: number;
  breakdown: CategoryScoreDetail[];
}
