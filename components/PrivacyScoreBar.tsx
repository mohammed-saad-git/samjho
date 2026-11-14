'use client';

import { useEffect, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { HelpCircle, ShieldCheck } from 'lucide-react';
import type { Finding, PrivacyScoreReport } from '@/lib/detect';
import { getLanguageConfig, type LanguageCode } from '@/lib/i18n/languages';
import { UI_TRANSLATIONS } from '@/lib/i18n/translations';

interface PrivacyScoreBarProps {
  language: LanguageCode;
  beforeScore: PrivacyScoreReport;
  afterScore: PrivacyScoreReport;
  findings: readonly Finding[];
  hasSentToServer: boolean;
  scanKey: number;
}

function summarizeCategories(findings: readonly Finding[], language: LanguageCode): string {
  const strings = UI_TRANSLATIONS[language];
  const labels = new Set<string>();
  for (const f of findings) {
    switch (f.category) {
      case 'AADHAAR':
        labels.add('Aadhaar');
        break;
      case 'PAN':
        labels.add('PAN');
        break;
      case 'PHONE':
        labels.add('phone number');
        break;
      case 'EMAIL':
        labels.add('email');
        break;
      case 'UPI':
        labels.add('UPI ID');
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
        labels.add('passport');
        break;
      case 'IFSC':
        labels.add('IFSC');
        break;
      case 'REDACTED':
        labels.add('selected words');
        break;
    }
  }
  const list = Array.from(labels);
  if (list.length === 0) return strings.noIdentifiersDetected;
  if (list.length === 1) return `${list[0]} ${strings.removedSingleSummary}`;
  const head = list.slice(0, -1).join(', ');
  const tail = list[list.length - 1];
  return `${head} & ${tail} — ${strings.removedListSummary}`;
}

export function PrivacyScoreBar({
  language,
  beforeScore,
  afterScore,
  findings,
  hasSentToServer,
  scanKey,
}: PrivacyScoreBarProps) {
  const [displayAfter, setDisplayAfter] = useState(afterScore.score);
  const langConfig = getLanguageConfig(language);
  const strings = UI_TRANSLATIONS[language];

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
      aria-label={strings.privacyScoreLabel}
      className={`border-y py-4 ${langConfig.fontClass}`}
      style={{
        borderColor: highRemaining ? 'var(--risk-high)' : 'var(--border-hairline)',
      }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-xs font-medium break-words"
              style={{
                backgroundColor: hasSentToServer
                  ? 'var(--bg-inset)'
                  : 'var(--accent-protected-surface)',
                color: hasSentToServer ? 'var(--text-ink)' : 'var(--accent-protected)',
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span>{hasSentToServer ? strings.statusSent : strings.statusNotSent}</span>
            </span>
          </div>

          <p className="text-sm break-words">{summarizeCategories(findings, language)}</p>
        </div>

        <div
          className="flex shrink-0 items-center justify-between border-t pt-3 md:border-l md:border-t-0 md:pl-6 md:pt-0"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <div>
            <div className="flex items-center gap-1">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {strings.privacyScoreLabel}
              </span>
              <Tooltip.Provider delayDuration={150}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      className="-my-2 -mr-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[4px]"
                      aria-label={strings.privacyScoreTooltipHelp}
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
        <p className="mt-2.5 text-xs font-medium break-words" style={{ color: 'var(--risk-high)' }}>
          {strings.highRiskRemainingWarning}
        </p>
      ) : null}
    </section>
  );
}
