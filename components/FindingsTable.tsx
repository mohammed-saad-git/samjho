'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { HelpCircle } from 'lucide-react';
import type { Finding, PIICategory, Severity } from '@/lib/detect';

interface FindingsTableProps {
  findings: readonly Finding[];
}

interface AggregatedRow {
  category: PIICategory;
  label: string;
  count: number;
  tokens: string[];
  minConfidence: number;
  maxConfidence: number;
  severity: Severity;
  note: string;
}

const CATEGORY_METADATA: Record<PIICategory, { label: string; note: string }> = {
  AADHAAR: {
    label: 'Aadhaar Number',
    note: '12 digits starting 2–9, verified with Verhoeff checksum',
  },
  PAN: {
    label: 'PAN Card',
    note: '10-character PAN with valid 4th-letter entity code',
  },
  PHONE: {
    label: 'Mobile Number',
    note: '10-digit Indian mobile number pattern',
  },
  EMAIL: {
    label: 'Email Address',
    note: 'Standard email address format',
  },
  UPI: {
    label: 'UPI Payment ID',
    note: 'Virtual payment address (handle@bank)',
  },
  IFSC: {
    label: 'Bank IFSC Code',
    note: '11-character Indian bank branch code',
  },
  PASSPORT: {
    label: 'Passport Number',
    note: 'Indian passport alphanumeric format',
  },
  DOB: {
    label: 'Date of Birth',
    note: 'Date anchored to a birth date label; deadlines are preserved',
  },
  ACCOUNT: {
    label: 'Account / Ref No.',
    note: 'Consumer, loan, bank account, or application number',
  },
  ADDRESS: {
    label: 'Postal Address',
    note: 'Address block anchored to a label or 6-digit Indian PIN code',
  },
  PERSON: {
    label: 'Person Name (heuristic)',
    note: 'Detected from labels and honorifics; click words above to adjust manually',
  },
  REDACTED: {
    label: 'Manual Redaction',
    note: 'Added manually by clicking a word in the original text',
  },
};

export function FindingsTable({ findings }: FindingsTableProps) {
  if (findings.length === 0) {
    return (
      <section
        aria-label="Detected identifiers"
        className="rounded-[6px] border p-4 text-sm"
        style={{
          borderColor: 'var(--border-hairline)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-muted)',
        }}
      >
        No personal identifiers are currently marked for redaction. Click any word in the original
        document above if you want to mask it manually.
      </section>
    );
  }

  const grouped = new Map<PIICategory, AggregatedRow>();
  for (const finding of findings) {
    const existing = grouped.get(finding.category);
    const meta = CATEGORY_METADATA[finding.category];
    if (!existing) {
      grouped.set(finding.category, {
        category: finding.category,
        label: meta.label,
        count: 1,
        tokens: [finding.token],
        minConfidence: finding.confidence,
        maxConfidence: finding.confidence,
        severity: finding.severity,
        note: meta.note,
      });
    } else {
      existing.count += 1;
      if (!existing.tokens.includes(finding.token)) {
        existing.tokens.push(finding.token);
      }
      existing.minConfidence = Math.min(existing.minConfidence, finding.confidence);
      existing.maxConfidence = Math.max(existing.maxConfidence, finding.confidence);
      if (finding.severity === 'high') {
        existing.severity = 'high';
      }
    }
  }

  const rows = Array.from(grouped.values()).sort((a, b) => {
    const rank = { high: 3, medium: 2, low: 1 };
    if (rank[b.severity] !== rank[a.severity]) {
      return rank[b.severity] - rank[a.severity];
    }
    return b.count - a.count;
  });

  return (
    <section
      aria-labelledby="findings-table-heading"
      className="rounded-[6px] border"
      style={{
        borderColor: 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <h3 id="findings-table-heading" className="text-sm font-medium">
          Identifiers detected &amp; masked on device
        </h3>
        <span className="font-mono-code text-xs" style={{ color: 'var(--text-muted)' }}>
          {findings.length} {findings.length === 1 ? 'span' : 'spans'} across {rows.length}{' '}
          {rows.length === 1 ? 'category' : 'categories'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr
              className="border-b font-mono-code text-xs uppercase tracking-wider"
              style={{
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-muted)',
              }}
            >
              <th scope="col" className="px-4 py-2 font-medium">
                Category
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Count
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Session tokens
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Confidence
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Severity
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const confPercent = Math.round(row.maxConfidence * 100);
              const confLabel =
                row.category === 'PERSON'
                  ? `Heuristic (${confPercent}%)`
                  : row.category === 'REDACTED'
                    ? 'Manual (100%)'
                    : `${confPercent}%`;

              return (
                <tr
                  key={row.category}
                  className="border-b last:border-b-0"
                  style={{ borderColor: 'var(--border-hairline)' }}
                >
                  <td className="px-4 py-2 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>{row.label}</span>
                      <Tooltip.Provider delayDuration={150}>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-5 w-5 items-center justify-center rounded-[3px]"
                              aria-label={`Details about ${row.label} detection`}
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              sideOffset={5}
                              className="z-50 max-w-xs rounded-[4px] border px-2.5 py-1.5 text-xs"
                              style={{
                                borderColor: 'var(--text-ink)',
                                backgroundColor: 'var(--text-ink)',
                                color: 'var(--bg-paper)',
                              }}
                            >
                              {row.note}
                              <Tooltip.Arrow style={{ fill: 'var(--text-ink)' }} />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono-code text-xs">{row.count}</td>
                  <td className="px-3 py-2 font-mono-code text-xs">{row.tokens.join(', ')}</td>
                  <td className="px-3 py-2 font-mono-code text-xs">{confLabel}</td>
                  <td className="px-4 py-2">
                    <span
                      className="inline-block rounded-[3px] px-2 py-0.5 font-mono-code text-xs uppercase"
                      style={{
                        backgroundColor:
                          row.severity === 'high'
                            ? 'var(--risk-high-surface)'
                            : 'var(--risk-medium-surface)',
                        color: row.severity === 'high' ? 'var(--risk-high)' : 'var(--risk-medium)',
                      }}
                    >
                      {row.severity}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
