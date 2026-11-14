import type { CandidateMatch } from './types';

const NON_NAME_STOPWORDS = new Set([
  'account',
  'accounts',
  'address',
  'aged',
  'agreement',
  'allottee',
  'amount',
  'applicant',
  'application',
  'authorized',
  'bank',
  'beneficiary',
  'bengaluru',
  'bill',
  'billing',
  'board',
  'borrower',
  'branch',
  'charges',
  'chennai',
  'city',
  'company',
  'consumer',
  'cooperative',
  'corporation',
  'customer',
  'date',
  'daughter',
  'dear',
  'delhi',
  'department',
  'directorate',
  'distribution',
  'division',
  'dr',
  'electricity',
  'email',
  'engineer',
  'father',
  'female',
  'finance',
  'flat',
  'from',
  'government',
  'holder',
  'house',
  'husband',
  'hyderabad',
  'income',
  'india',
  'indian',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'kolkata',
  'kumari',
  'landlord',
  'late',
  'lessee',
  'lessor',
  'limited',
  'loan',
  'lucknow',
  'madam',
  'male',
  'manager',
  'md',
  'miss',
  'mobile',
  'mr',
  'mrs',
  'ms',
  'mumbai',
  'municipal',
  'name',
  'navi',
  'notice',
  'number',
  'office',
  'officer',
  'owner',
  'pan',
  'payee',
  'payment',
  'phone',
  'plot',
  'policy',
  'power',
  'premises',
  'prof',
  'pune',
  'recipient',
  'registered',
  'registration',
  'rent',
  'residing',
  'road',
  'scholarship',
  'section',
  'sector',
  'selvi',
  'service',
  'shri',
  'shrimati',
  'signatory',
  'sir',
  'smt',
  'society',
  'son',
  'sri',
  'state',
  'street',
  'subject',
  'tax',
  'tenant',
  'the',
  'thiru',
  'total',
  'utility',
  'welfare',
  'wife',
]);

const TRAILING_BOUNDARY_WORDS = new Set([
  'aged',
  'residing',
  'son',
  'daughter',
  'wife',
  'husband',
  'holder',
  'tenant',
  'borrower',
  'lessor',
  'lessee',
  'landlord',
  'applicant',
  'beneficiary',
  'consumer',
  'customer',
  'hereinafter',
  'bearing',
  'whose',
  'having',
  'from',
  'at',
  'on',
  'for',
  'of',
  'with',
  'and',
  'or',
  'is',
  'has',
]);

function trimNameStopwords(rawName: string): string {
  const tokens = rawName.trim().split(/\s+/);
  const kept: string[] = [];

  for (const token of tokens) {
    const clean = token.replace(/[.,;:]+$/g, '').toLowerCase();
    if (!clean) break;
    if (kept.length === 0 && NON_NAME_STOPWORDS.has(clean)) {
      return '';
    }
    if (TRAILING_BOUNDARY_WORDS.has(clean) || NON_NAME_STOPWORDS.has(clean)) {
      break;
    }
    kept.push(token.replace(/[,;:]+$/g, ''));
  }

  // Must not be a single 1-letter initial or all-stopword phrase
  const joined = kept.join(' ').trim();
  if (joined.length < 3) return '';
  if (kept.length === 1 && NON_NAME_STOPWORDS.has(joined.toLowerCase())) return '';
  return joined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Heuristic person-name detector using labeled fields, Indian & English honorifics,
 * relationship markers (S/o, D/o, W/o), and exact repeat mentions of discovered names.
 */
export function detectNames(text: string): CandidateMatch[] {
  const candidates: CandidateMatch[] = [];
  const discoveredMultiWordNames = new Set<string>();

  const honorificPrefix =
    '(?:(?:Mr|Mrs|Ms|Miss|Dr|Prof|Shri|Shrimati|Smt|Kumari|Sri|Thiru|Selvi|Late)\\.?[ \\t]+)';
  const nameCapture =
    '([A-Z][a-z]{1,22}(?:[ \\t]+(?:[A-Z][a-z]{1,22}|[A-Z]\\.(?=[ \\t]|$)|[A-Z](?=[ \\t]|$))){0,3})';

  // 1. Labeled person fields: e.g. "Consumer Name: Shri Rameshwar Prasad Sharma"
  const labeledRegex = new RegExp(
    `\\b(?:Consumer\\s+Name|Customer\\s+Name|Account\\s+Holder(?:\\s+Name)?|Holder\\s+Name|Name\\s+of\\s+(?:the\\s+)?(?:Applicant|Consumer|Tenant|Borrower|Customer|Recipient|Beneficiary|Payee|Allottee)|Applicant\\s+Name|Borrower(?:\\s+Name)?|Tenant(?:\\s+Name)?|Lessee|Lessor|Landlord|Beneficiary|Full\\s+Name|Name)\\s*[:\\-]\\s*${honorificPrefix}?${nameCapture}`,
    'g'
  );

  let match: RegExpExecArray | null;
  while ((match = labeledRegex.exec(text)) !== null) {
    const raw = match[1];
    if (!raw) continue;
    const cleaned = trimNameStopwords(raw);
    if (!cleaned) continue;
    const start = match.index + match[0].indexOf(raw);
    candidates.push({
      category: 'PERSON',
      start,
      end: start + cleaned.length,
      text: cleaned,
      confidence: 0.88,
      severity: 'medium',
      reason: 'Labeled person name field',
    });
    if (cleaned.includes(' ')) {
      discoveredMultiWordNames.add(cleaned);
    }
  }

  // 2. Salutations: "Dear Shri Rameshwar Sharma" or "Dear Ms. Kavitha"
  const dearRegex = new RegExp(`\\bDear\\s+${honorificPrefix}?${nameCapture}`, 'g');
  while ((match = dearRegex.exec(text)) !== null) {
    const raw = match[1];
    if (!raw) continue;
    const cleaned = trimNameStopwords(raw);
    if (!cleaned) continue;
    const start = match.index + match[0].indexOf(raw);
    candidates.push({
      category: 'PERSON',
      start,
      end: start + cleaned.length,
      text: cleaned,
      confidence: 0.85,
      severity: 'medium',
      reason: 'Salutation with person name',
    });
    if (cleaned.includes(' ')) {
      discoveredMultiWordNames.add(cleaned);
    }
  }

  // 3. Honorific patterns anywhere in text: "Shri Rameshwar Prasad Sharma", "Ms. Kavitha Rajagopal"
  const honorificRegex = new RegExp(`\\b${honorificPrefix}${nameCapture}`, 'g');
  while ((match = honorificRegex.exec(text)) !== null) {
    const raw = match[1];
    if (!raw) continue;
    const cleaned = trimNameStopwords(raw);
    if (!cleaned) continue;
    const start = match.index + match[0].indexOf(raw);
    candidates.push({
      category: 'PERSON',
      start,
      end: start + cleaned.length,
      text: cleaned,
      confidence: 0.81,
      severity: 'medium',
      reason: 'Honorific followed by capitalized name',
    });
    if (cleaned.includes(' ')) {
      discoveredMultiWordNames.add(cleaned);
    }
  }

  // 4. Relationship markers: "S/o Shri ...", "D/o ...", "W/o ..."
  const relRegex = new RegExp(
    `\\b(?:S\\/o|D\\/o|W\\/o|C\\/o)\\s+${honorificPrefix}?${nameCapture}`,
    'g'
  );
  while ((match = relRegex.exec(text)) !== null) {
    const raw = match[1];
    if (!raw) continue;
    const cleaned = trimNameStopwords(raw);
    if (!cleaned) continue;
    const start = match.index + match[0].indexOf(raw);
    candidates.push({
      category: 'PERSON',
      start,
      end: start + cleaned.length,
      text: cleaned,
      confidence: 0.78,
      severity: 'medium',
      reason: 'Relationship marker followed by capitalized name',
    });
    if (cleaned.includes(' ')) {
      discoveredMultiWordNames.add(cleaned);
    }
  }

  // 5. Repeat-mention pass: ensure full names already found via labels/honorifics are also caught
  // when repeated later without honorifics (e.g. signature lines).
  for (const fullName of discoveredMultiWordNames) {
    const repeatRegex = new RegExp(`\\b${escapeRegExp(fullName)}\\b`, 'g');
    while ((match = repeatRegex.exec(text)) !== null) {
      candidates.push({
        category: 'PERSON',
        start: match.index,
        end: match.index + fullName.length,
        text: fullName,
        confidence: 0.86,
        severity: 'medium',
        reason: 'Repeated mention of identified person name',
      });
    }
  }

  return candidates;
}
