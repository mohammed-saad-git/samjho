import type { CandidateMatch } from './types.ts';
import { validateVerhoeff } from './verhoeff.ts';

const MONTH_PATTERN =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

/**
 * Matches Indian Aadhaar numbers (12 digits, starting 2-9, optional spaces/hyphens)
 * verified with the Verhoeff checksum.
 */
function detectAadhaar(text: string): CandidateMatch[] {
  const results: CandidateMatch[] = [];
  const regex = /(?<![\d+])[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}(?!\d)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    if (validateVerhoeff(raw)) {
      results.push({
        category: 'AADHAAR',
        start: match.index,
        end: match.index + raw.length,
        text: raw,
        confidence: 0.99,
        severity: 'high',
        reason: '12-digit number verified by Verhoeff checksum',
      });
    }
  }
  return results;
}

/**
 * Matches Indian PAN cards: 3 letters + entity type char + 1 letter + 4 digits + 1 letter.
 */
function detectPan(text: string): CandidateMatch[] {
  const results: CandidateMatch[] = [];
  const regex = /\b[A-Z]{3}[PCFHATBLJG][A-Z][0-9]{4}[A-Z]\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({
      category: 'PAN',
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      confidence: 0.98,
      severity: 'high',
      reason: 'PAN format with valid 4th-character entity type',
    });
  }
  return results;
}

/**
 * Matches Indian mobile numbers with optional +91 / 91 / 0 prefix and 10 digits starting 6-9.
 */
function detectPhone(text: string): CandidateMatch[] {
  const results: CandidateMatch[] = [];
  const regex =
    /(?<!\d)(?:\+91[\s-]?|(?<![A-Z0-9-])91[\s-]?|0)?(?:[6-9]\d{4}[\s-]?\d{5}|[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4})(?!\d)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 12) continue;
    // Avoid matching a valid 12-digit unspaced Aadhaar unless preceded by +
    if (!raw.startsWith('+') && digitsOnly.length === 12 && validateVerhoeff(digitsOnly)) {
      continue;
    }
    results.push({
      category: 'PHONE',
      start: match.index,
      end: match.index + raw.length,
      text: raw,
      confidence: 0.94,
      severity: 'high',
      reason: 'Indian 10-digit mobile pattern',
    });
  }
  return results;
}

/**
 * Matches standard email addresses.
 */
function detectEmail(text: string): CandidateMatch[] {
  const results: CandidateMatch[] = [];
  const regex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({
      category: 'EMAIL',
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      confidence: 0.98,
      severity: 'high',
      reason: 'Email address pattern',
    });
  }
  return results;
}

/**
 * Matches Indian UPI VPAs (handle@psp) and UPI-labeled VPAs.
 */
function detectUpi(text: string): CandidateMatch[] {
  const results: CandidateMatch[] = [];
  const pspRegex =
    /\b[A-Za-z0-9._-]{2,64}@(?:okicici|oksbi|okaxis|okhdfcbank|ybl|ibl|axl|paytm|upi|apl|sbi|icici|hdfcbank|axisbank|kotak|barodampay|idfcbank|pnb|indus|federal|mahb|abfspay|airtel|airtelpaymentsbank|fbl|hsbc|jupiteraxis|kbl|pingpay|rbl|sib|unionbank|waaxis|wahdfcbank|waicici|wasbi|yesbank|yesbankltd)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = pspRegex.exec(text)) !== null) {
    results.push({
      category: 'UPI',
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      confidence: 0.94,
      severity: 'high',
      reason: 'Known Indian UPI payment handle',
    });
  }

  const labeledRegex =
    /\b(?:UPI(?:\s*ID)?|VPA)\s*[:\-]\s*([A-Za-z0-9._-]{2,64}@[A-Za-z0-9]{2,32})\b/gi;
  while ((match = labeledRegex.exec(text)) !== null) {
    const captured = match[1];
    if (!captured) continue;
    const start = match.index + match[0].lastIndexOf(captured);
    results.push({
      category: 'UPI',
      start,
      end: start + captured.length,
      text: captured,
      confidence: 0.9,
      severity: 'high',
      reason: 'Labeled UPI ID',
    });
  }

  return results;
}

/**
 * Matches Indian IFSC bank branch codes (4 uppercase letters + 0 + 6 alphanumeric chars).
 */
function detectIfsc(text: string): CandidateMatch[] {
  const results: CandidateMatch[] = [];
  const regex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({
      category: 'IFSC',
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      confidence: 0.95,
      severity: 'medium',
      reason: '11-character IFSC bank code',
    });
  }
  return results;
}

/**
 * Matches Indian passport numbers (1 uppercase letter + 7 digits, optional space after 3rd char).
 */
function detectPassport(text: string): CandidateMatch[] {
  const results: CandidateMatch[] = [];
  const regex = /\b[A-PR-WYZ][1-9]\d\s?\d{4}[1-9]\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({
      category: 'PASSPORT',
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      confidence: 0.89,
      severity: 'high',
      reason: 'Indian passport number format',
    });
  }
  return results;
}

/**
 * Matches Dates of Birth ONLY when anchored by a DOB label.
 * Deliberately leaves bill dates, issue dates, and payment deadlines unredacted.
 */
function detectDob(text: string): CandidateMatch[] {
  const results: CandidateMatch[] = [];
  const dateRegex = new RegExp(
    `\\b(?:DOB|D\\.O\\.B\\.?|Date\\s+of\\s+Birth|Birth\\s+Date|Born\\s+on)\\s*[:\\-]?\\s*(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4}|\\d{1,2}\\s+${MONTH_PATTERN}\\s+\\d{4})\\b`,
    'gi'
  );
  let match: RegExpExecArray | null;
  while ((match = dateRegex.exec(text)) !== null) {
    const captured = match[1];
    if (!captured) continue;
    const start = match.index + match[0].lastIndexOf(captured);
    results.push({
      category: 'DOB',
      start,
      end: start + captured.length,
      text: captured,
      confidence: 0.94,
      severity: 'high',
      reason: 'Date of birth field',
    });
  }
  return results;
}

/**
 * Matches keyword-anchored account, consumer, loan, policy, meter, and application numbers.
 */
function detectAccountNumbers(text: string): CandidateMatch[] {
  const results: CandidateMatch[] = [];
  const regex =
    /\b(?:A\/[cC]|Account\s*(?:No\.?|Number|#)|Acct\.?\s*(?:No\.?|Number)|Consumer\s*(?:No\.?|Number|ID)|Customer\s*(?:ID|No\.?|Number)|Policy\s*(?:No\.?|Number)|Loan\s*(?:A\/[cC]|Account\s*(?:No\.?|Number)?)|Application\s*(?:No\.?|Number|ID)|Registration\s*(?:No\.?|Number|ID)|Certificate\s*(?:No\.?|Number)|Service\s*(?:No\.?|Number|ID)|Meter\s*(?:No\.?|Number)|CA\s*(?:No\.?|Number)|CRN|CIF\s*(?:No\.?|Number|ID)?|PRAN|UAN|Folio\s*(?:No\.?|Number))\s*(?:is|:|#|-)?\s*([A-Z0-9]{2,}(?:[\/-][A-Z0-9]{1,})+|\d{3,6}(?:\s+\d{3,6}){1,3}|[A-Z0-9]{4,22})\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const captured = match[1];
    if (!captured) continue;
    const digitCount = (captured.match(/\d/g) ?? []).length;
    if (digitCount < 3) continue;
    const start = match.index + match[0].lastIndexOf(captured);
    // Do not match if immediately preceded by currency indicators
    const prefixCheck = text.slice(Math.max(0, start - 6), start);
    if (/(?:Rs\.?|INR|₹)\s*$/i.test(prefixCheck)) continue;
    results.push({
      category: 'ACCOUNT',
      start,
      end: start + captured.length,
      text: captured,
      confidence: 0.91,
      severity: 'high',
      reason: 'Keyword-anchored account or reference identifier',
    });
  }
  return results;
}

/**
 * Matches Indian postal addresses anchored by an address label or containing a 6-digit PIN code.
 */
function detectAddresses(text: string): CandidateMatch[] {
  const results: CandidateMatch[] = [];

  // 1. Labeled address blocks (single-line or multi-line ending at next label or PIN code)
  const labeledRegex =
    /\b(?:Residential\s+Address|Billing\s+Address|Property\s+Address|Registered\s+Address|Postal\s+Address|Correspondence\s+Address|Premises\s+Address|Address|Residing\s+at|Premises|R\/o)\s*[:\-]\s*([^\n]+(?:\n(?![A-Za-z][A-Za-z\s/]{1,28}:)[^\n]{2,110}){0,2})/gi;

  let match: RegExpExecArray | null;
  while ((match = labeledRegex.exec(text)) !== null) {
    const rawGroup = match[1];
    if (!rawGroup) continue;
    const rawLines = rawGroup.split('\n');
    const keptLines: string[] = [];
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i]!;
      if (
        i > 0 &&
        /^\s*(?:[-=_]{3,}|\d+[.)]\s|Dear\b|Sub(?:ject)?\b|Ref\b|Notice\b|Clause\b|Schedule\b|WHEREAS\b|NOW\s+THIS\b|BILLING\b|LOAN\b|IMPORTANT\b|Total\b|Amount\b|Date\b)/i.test(
          line
        )
      ) {
        break;
      }
      keptLines.push(line);
      if (/\b[1-9]\d{5}\b/.test(line)) {
        break;
      }
    }
    const trimmed = keptLines.join('\n').trimEnd();
    const hasPin = /\b[1-9]\d{5}\b/.test(trimmed);
    const hasAddressHint =
      /\b(?:Flat|House|H\.?\s*No|Door|Plot|Road|Rd|Street|St|Lane|Nagar|Colony|Layout|Sector|Phase|Block|Floor|Apt|Apartment|Cross|Main|Marg|Vihar|Puram|Pincode|PIN)\b/i.test(
        trimmed
      );
    if (!hasPin && (!hasAddressHint || trimmed.length < 14)) continue;

    const start = match.index + match[0].indexOf(trimmed);
    results.push({
      category: 'ADDRESS',
      start,
      end: start + trimmed.length,
      text: trimmed,
      confidence: hasPin ? 0.89 : 0.8,
      severity: 'medium',
      reason: hasPin ? 'Labeled address with 6-digit PIN code' : 'Labeled postal address',
    });
  }

  // 2. Unlabeled Indian street/flat lines terminating in a 6-digit PIN code
  const pinLineRegex =
    /\b(?:Flat|House|H\.?\s*No\.?|Door\s*No\.?|Plot\s*No\.?|Shop\s*No\.?|No\.?\s*\d+[A-Za-z]?[,/])[^\n]{6,140}?\b[1-9]\d{5}\b/gi;
  while ((match = pinLineRegex.exec(text)) !== null) {
    const raw = match[0].trim();
    results.push({
      category: 'ADDRESS',
      start: match.index,
      end: match.index + raw.length,
      text: raw,
      confidence: 0.83,
      severity: 'medium',
      reason: 'Address phrase with Indian PIN code',
    });
  }

  return results;
}

/**
 * Runs all deterministic and structured pattern detectors on input text.
 */
export function detectPatternMatches(text: string): CandidateMatch[] {
  return [
    ...detectAadhaar(text),
    ...detectPan(text),
    ...detectEmail(text),
    ...detectUpi(text),
    ...detectPhone(text),
    ...detectDob(text),
    ...detectAccountNumbers(text),
    ...detectPassport(text),
    ...detectIfsc(text),
    ...detectAddresses(text),
  ];
}
