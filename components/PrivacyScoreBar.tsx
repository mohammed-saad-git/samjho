'use client';

import { useEffect, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { HelpCircle, ShieldCheck } from 'lucide-react';
import type { Finding, PrivacyScoreReport } from '@/lib/detect';

interface PrivacyScoreBarProps {
  beforeScore: PrivacyScoreReport;
  afterScore: PrivacyScoreReport;
  findings: readonly Finding[];
  hasSentToServer: boolean;
  scanKey: number;
}

function summarizeCategories(findings: readonly Finding[]): string {
  const labels = new Set<string>();
  for (const f of findings) {
    switch (f.category) {
      case 'AADHAAR':
        labels.add('Aadhaar number');
        break;
      case 'PAN':
        labels.add('PAN');
        break;
      case 'PHONE':
        labels.add('phone number');
        break;
      case 'EMAIL':
        labels.add('email address');
        break;
      case 'UPI':
        labels.add('UPI handle');
        break;
      case 'ACCOUNT':
        labels.add('account number');
        break;
      case 'PERSON':
        labels.add('name');
        break;
      case 'ADDRESS':
        labels.add('address');
        break;
      case 'DOB':
        labels.add('date of birth');
        break;
      case 'PASSPORT':
        labels.add('passport number');
        break;
      case 'IFSC':
        labels.add('IFSC code');
        break;
      case 'REDACTED':
        labels.add('selected words');
        break;
    }
  }
  const list = Array.from(labels);
  if (list.length === 0) return 'No personal identifiers were detected';
  if (list.length === 1)
    return `Your ${list[0]} is removed on this device before the text goes to the AI.`;
  const head = list.slice(0, -1).join(', ');
  const tail = list[list.length - 1];
  return `Your ${head} and ${tail} are removed on this device before the text goes to the AI.`;
}

export function PrivacyScoreBar({
  beforeScore,
  afterScore,
  findings,
  hasSentToServer,
  scanKey,
}: PrivacyScoreBarProps) {
  const [displayAfter, setDisplayAfter] = useState(afterScore.score);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const startVal = beforeScore.score;
    const targetVal = afterScore.score;

    if (prefersReduced || startVal === targetVal) {
      const frameId = requestAnimationFrame(() => setDisplayAfter(targetVal));
      return () => cancelAnimationFrame(frameId);
    }

    const durationMs = 240;
    const startTime = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayAfter(Math.round(startVal + (targetVal - startVal) * eased));
      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [beforeScore.score, afterScore.score, scanKey]);

  const highRemaining = afterScore.breakdown.some((b) =>
    ['AADHAAR', 'PAN', 'PHONE', 'EMAIL', 'ACCOUNT', 'PASSPORT', 'DOB', 'UPI'].includes(b.category)
  );

  return (
    <section
      aria-label="On-device privacy check"
      className="rounded-[6px] border p-4 sm:px-6"
      style={{
        borderColor: highRemaining ? 'var(--risk-high)' : 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-[4px] px-2 py-0.5 font-mono-code text-xs font-medium"
              style={{
                backgroundColor: hasSentToServer
                  ? 'var(--bg-inset)'
                  : 'var(--accent-protected-surface)',
                color: hasSentToServer ? 'var(--text-ink)' : 'var(--accent-protected)',
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              <span>
                {hasSentToServer
                  ? 'Redacted text sent for explanation. Identifiers stay on device.'
                  : 'Nothing has been sent yet.'}
              </span>
            </span>
          </div>

          <p className="text-sm">{summarizeCategories(findings)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div
            className="rounded-[4px] border px-3.5 py-2"
            style={{
              borderColor: 'var(--border-hairline)',
              backgroundColor: 'var(--bg-paper)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="font-mono-code text-xs uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Privacy score
              </span>
              <Tooltip.Provider delayDuration={150}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-[3px]"
                      aria-label="How the privacy score is calculated"
                    >
                      <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      sideOffset={6}
                      className="z-50 max-w-xs rounded-[4px] border px-3 py-2 text-xs leading-relaxed"
                      style={{
                        borderColor: 'var(--text-ink)',
                        backgroundColor: 'var(--text-ink)',
                        color: 'var(--bg-paper)',
                      }}
                    >
                      Computed by running the identifier risk scorer on the original text (
                      {beforeScore.score}/100) and again on the redacted text ({afterScore.score}
                      /100). Dates and rupee amounts remain so the explanation stays accurate.
                      <Tooltip.Arrow style={{ fill: 'var(--text-ink)' }} />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
            <div className="mt-0.5 flex items-baseline gap-2 font-mono-code text-lg font-medium">
              <span style={{ color: 'var(--risk-high)' }}>{beforeScore.score}</span>
              <span style={{ color: 'var(--text-muted)' }} aria-hidden="true">
                →
              </span>
              <span
                style={{
                  color: highRemaining ? 'var(--risk-high)' : 'var(--accent-protected)',
                }}
              >
                {displayAfter}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                / 100
              </span>
            </div>
          </div>
        </div>
      </div>

      {highRemaining ? (
        <p className="mt-2.5 text-xs font-medium" style={{ color: 'var(--risk-high)' }}>
          One or more high-severity identifiers remain unredacted in the outgoing text. Re-enable
          redaction before sending.
        </p>
      ) : null}
    </section>
  );
}
