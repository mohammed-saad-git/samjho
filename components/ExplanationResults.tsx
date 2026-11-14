'use client';

import * as Switch from '@radix-ui/react-switch';
import { rehydrateText, type SessionVault } from '@/lib/detect';
import { getLanguageConfig, type LanguageCode } from '@/lib/i18n/languages';
import { UI_TRANSLATIONS } from '@/lib/i18n/translations';
import type { ExplainResponse } from '@/lib/llm/schema';
import { AudioReader } from './AudioReader';
import { DraftReplyBox } from './DraftReplyBox';
import { WhatsAppShare } from './WhatsAppShare';

interface ExplanationResultsProps {
  explanation: ExplainResponse;
  vault: SessionVault;
  language: LanguageCode;
  showRealDetails: boolean;
  onShowRealDetailsChange: (next: boolean) => void;
  sourceKind: 'sample' | 'live';
  isLoadingLive: boolean;
  onRequestLiveRun?: () => void;
}

function applyDisplayTransform(text: string, vault: SessionVault, showReal: boolean): string {
  return showReal ? rehydrateText(text, vault) : text;
}

export function ExplanationResults({
  explanation,
  vault,
  language,
  showRealDetails,
  onShowRealDetailsChange,
  sourceKind,
  isLoadingLive,
  onRequestLiveRun,
}: ExplanationResultsProps) {
  const langConfig = getLanguageConfig(language);
  const strings = UI_TRANSLATIONS[language];

  const displayDocType = applyDisplayTransform(explanation.documentType, vault, showRealDetails);
  const displaySummary = applyDisplayTransform(explanation.summary, vault, showRealDetails);
  const displayKeyFacts = explanation.keyFacts.map((item) => ({
    label: applyDisplayTransform(item.label, vault, showRealDetails),
    value: applyDisplayTransform(item.value, vault, showRealDetails),
  }));
  const displayAmounts = explanation.amounts.map((item) => ({
    value: applyDisplayTransform(item.value, vault, showRealDetails),
    what: applyDisplayTransform(item.what, vault, showRealDetails),
  }));
  const displayDeadlines = explanation.deadlines.map((item) => ({
    date: applyDisplayTransform(item.date, vault, showRealDetails),
    what: applyDisplayTransform(item.what, vault, showRealDetails),
  }));
  const displayWatchOuts = explanation.watchOuts.map((item) =>
    applyDisplayTransform(item, vault, showRealDetails)
  );
  const displayNextSteps = explanation.nextSteps.map((item) =>
    applyDisplayTransform(item, vault, showRealDetails)
  );
  const displayDraftReply = applyDisplayTransform(explanation.draftReply, vault, showRealDetails);

  return (
    <article
      aria-labelledby="explanation-heading"
      className="rounded-[6px] border"
      style={{
        borderColor: 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {/* Header bar */}
      <div
        className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-[3px] border px-2 py-0.5 font-mono-code text-xs"
              style={{
                borderColor: 'var(--border-hairline)',
                backgroundColor: 'var(--bg-paper)',
                color: 'var(--text-muted)',
              }}
            >
              {sourceKind === 'sample' ? 'sample, pre-generated' : 'live AI response'}
            </span>
            {sourceKind === 'sample' && onRequestLiveRun ? (
              <button
                type="button"
                disabled={isLoadingLive}
                onClick={onRequestLiveRun}
                className="min-h-[32px] font-mono-code text-xs underline underline-offset-4 disabled:opacity-50"
                style={{ color: 'var(--accent-protected)' }}
              >
                {isLoadingLive ? 'Running live AI…' : 'Run live API instead'}
              </button>
            ) : null}
          </div>
          <h2
            id="explanation-heading"
            className={`font-serif-heading text-2xl font-medium ${langConfig.fontClass}`}
          >
            {displayDocType}
          </h2>
        </div>

        <label
          htmlFor="switch-rehydrate"
          className="flex min-h-[44px] cursor-pointer items-center gap-2.5 self-start rounded-[4px] border px-3 py-1.5 text-xs font-medium sm:self-auto"
          style={{
            borderColor: 'var(--border-hairline)',
            backgroundColor: 'var(--bg-paper)',
          }}
        >
          <span>Show real details locally</span>
          <Switch.Root
            id="switch-rehydrate"
            checked={showRealDetails}
            onCheckedChange={onShowRealDetailsChange}
            className="samjho-switch-root"
            aria-label="Toggle local restoration of redacted identifiers"
          >
            <Switch.Thumb className="samjho-switch-thumb" />
          </Switch.Root>
        </label>
      </div>

      {/* Reading-order content sections */}
      <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
        {/* 1. Plain-language summary + Audio */}
        <section className="space-y-3 p-4 sm:p-6" style={{ borderColor: 'var(--border-hairline)' }}>
          <h3 className={`font-serif-heading text-lg font-medium ${langConfig.fontClass}`}>
            {strings.sectionSummary}
          </h3>
          <AudioReader text={displaySummary} language={language} />
        </section>

        {/* 2. Key Facts */}
        {displayKeyFacts.length > 0 ? (
          <section
            className="space-y-3 p-4 sm:p-6"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
            <h3 className={`font-serif-heading text-lg font-medium ${langConfig.fontClass}`}>
              {strings.sectionKeyFacts}
            </h3>
            <dl
              className="grid grid-cols-1 divide-y rounded-[4px] border sm:grid-cols-2 sm:divide-x sm:divide-y-0"
              style={{
                borderColor: 'var(--border-hairline)',
                backgroundColor: 'var(--bg-paper)',
              }}
            >
              {displayKeyFacts.map((fact, idx) => (
                <div
                  key={`${fact.label}-${idx}`}
                  className="border-b px-4 py-2.5 last:border-b-0 sm:border-b"
                  style={{ borderColor: 'var(--border-hairline)' }}
                >
                  <dt className="font-mono-code text-xs" style={{ color: 'var(--text-muted)' }}>
                    {fact.label}
                  </dt>
                  <dd className={`mt-0.5 text-sm font-medium ${langConfig.fontClass}`}>
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {/* 3. Amounts & Deadlines */}
        <section
          className="grid grid-cols-1 gap-6 p-4 sm:p-6 md:grid-cols-2"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <div>
            <h3 className={`font-serif-heading text-lg font-medium ${langConfig.fontClass}`}>
              {strings.sectionAmounts}
            </h3>
            {displayAmounts.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                No monetary amounts mentioned.
              </p>
            ) : (
              <ul className="mt-2.5 space-y-2">
                {displayAmounts.map((item, idx) => (
                  <li
                    key={idx}
                    className="rounded-[4px] border px-3.5 py-2.5"
                    style={{
                      borderColor: 'var(--border-hairline)',
                      backgroundColor: 'var(--bg-paper)',
                    }}
                  >
                    <div className="font-mono-code text-sm font-medium">{item.value}</div>
                    <div className={`mt-0.5 text-sm ${langConfig.fontClass}`}>{item.what}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className={`font-serif-heading text-lg font-medium ${langConfig.fontClass}`}>
              {strings.sectionDeadlines}
            </h3>
            {displayDeadlines.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                No specific deadlines found.
              </p>
            ) : (
              <ul className="mt-2.5 space-y-2">
                {displayDeadlines.map((item, idx) => (
                  <li
                    key={idx}
                    className="rounded-[4px] border px-3.5 py-2.5"
                    style={{
                      borderColor: 'var(--border-hairline)',
                      backgroundColor: 'var(--bg-paper)',
                    }}
                  >
                    <div
                      className="font-mono-code text-xs font-medium"
                      style={{ color: 'var(--risk-medium)' }}
                    >
                      {item.date}
                    </div>
                    <div className={`mt-0.5 text-sm ${langConfig.fontClass}`}>{item.what}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 4. Watch Outs */}
        {displayWatchOuts.length > 0 ? (
          <section
            className="space-y-2.5 p-4 sm:p-6"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
            <h3 className={`font-serif-heading text-lg font-medium ${langConfig.fontClass}`}>
              {strings.sectionWatchOuts}
            </h3>
            <ul className={`list-disc space-y-1.5 pl-5 text-sm ${langConfig.fontClass}`}>
              {displayWatchOuts.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 5. Next Steps */}
        {displayNextSteps.length > 0 ? (
          <section
            className="space-y-2.5 p-4 sm:p-6"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
            <h3 className={`font-serif-heading text-lg font-medium ${langConfig.fontClass}`}>
              {strings.sectionNextSteps}
            </h3>
            <ol className={`list-decimal space-y-2 pl-5 text-sm ${langConfig.fontClass}`}>
              {displayNextSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* 6. Draft Reply */}
        <section className="p-4 sm:p-6" style={{ borderColor: 'var(--border-hairline)' }}>
          <DraftReplyBox
            draftReply={displayDraftReply}
            language={language}
            fontClass={langConfig.fontClass}
          />
        </section>

        {/* 7. Safe WhatsApp Share + Disclaimer */}
        <section className="space-y-3 p-4 sm:p-6" style={{ borderColor: 'var(--border-hairline)' }}>
          <WhatsAppShare rawRedactedExplanation={explanation} vault={vault} language={language} />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Samjho explains paperwork in plain language and helps organize next steps. It does not
            provide legal, medical, or financial advice.
          </p>
        </section>
      </div>
    </article>
  );
}
