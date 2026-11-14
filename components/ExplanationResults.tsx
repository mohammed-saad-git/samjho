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
      className={`divide-y border-y ${langConfig.fontClass}`}
      style={{ borderColor: 'var(--border-hairline)' }}
    >
      {/* Header band */}
      <div
        className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-[3px] border px-2 py-0.5 font-mono-code text-xs"
              style={{
                borderColor: 'var(--border-hairline)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-muted)',
              }}
            >
              {sourceKind === 'sample' ? strings.sampleTag : strings.liveTag}
            </span>
            {sourceKind === 'sample' && onRequestLiveRun ? (
              <button
                type="button"
                disabled={isLoadingLive}
                onClick={onRequestLiveRun}
                className={`inline-flex min-h-[44px] items-center px-2 text-xs font-medium underline underline-offset-4 disabled:opacity-50 ${langConfig.fontClass}`}
                style={{ color: 'var(--accent-protected)' }}
              >
                {isLoadingLive ? strings.runningLiveApiLabel : strings.runLiveApiLabel}
              </button>
            ) : null}
          </div>
          <h2
            id="explanation-heading"
            className={`font-serif-heading break-words text-2xl font-medium ${langConfig.fontClass}`}
          >
            {displayDocType}
          </h2>
        </div>

        <label
          htmlFor="switch-rehydrate"
          className="flex min-h-[44px] cursor-pointer items-center gap-2.5 self-start text-xs font-medium sm:self-auto"
        >
          <span>{strings.showRealDetailsLabel}</span>
          <Switch.Root
            id="switch-rehydrate"
            checked={showRealDetails}
            onCheckedChange={onShowRealDetailsChange}
            className="samjho-switch-root"
            aria-label={strings.showRealDetailsLabel}
          >
            <Switch.Thumb className="samjho-switch-thumb" />
          </Switch.Root>
        </label>
      </div>

      {/* 1. Plain-language summary + Audio */}
      <section className="space-y-3 py-5" style={{ borderColor: 'var(--border-hairline)' }}>
        <h3
          className={`font-serif-heading break-words text-lg font-medium ${langConfig.fontClass}`}
        >
          {strings.sectionSummary}
        </h3>
        <AudioReader text={displaySummary} language={language} />
      </section>

      {/* 2. Key Facts (flat hairline rows, zero nested borders or odd blank blocks) */}
      {displayKeyFacts.length > 0 ? (
        <section className="space-y-3 py-5" style={{ borderColor: 'var(--border-hairline)' }}>
          <h3
            className={`font-serif-heading break-words text-lg font-medium ${langConfig.fontClass}`}
          >
            {strings.sectionKeyFacts}
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
            {displayKeyFacts.map((fact, idx) => (
              <div
                key={`${fact.label}-${idx}`}
                className="border-b py-2.5"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <dt
                  className={`break-words text-xs font-medium ${langConfig.fontClass}`}
                  style={{ color: 'var(--text-muted)' }}
                >
                  {fact.label}
                </dt>
                <dd className={`mt-0.5 break-words text-sm font-medium ${langConfig.fontClass}`}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* 3. Amounts & Deadlines */}
      <section
        className="grid grid-cols-1 gap-8 py-5 md:grid-cols-2"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <div className="min-w-0">
          <h3
            className={`font-serif-heading break-words text-lg font-medium ${langConfig.fontClass}`}
          >
            {strings.sectionAmounts}
          </h3>
          {displayAmounts.length === 0 ? (
            <p className="mt-2 text-sm break-words" style={{ color: 'var(--text-muted)' }}>
              {strings.noAmountsFound}
            </p>
          ) : (
            <ul
              className="mt-2.5 divide-y border-t"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              {displayAmounts.map((item, idx) => (
                <li key={idx} className="py-2.5" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div className="break-words text-sm font-semibold tabular-nums">{item.value}</div>
                  <div className={`mt-0.5 break-words text-sm ${langConfig.fontClass}`}>
                    {item.what}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          <h3
            className={`font-serif-heading break-words text-lg font-medium ${langConfig.fontClass}`}
          >
            {strings.sectionDeadlines}
          </h3>
          {displayDeadlines.length === 0 ? (
            <p className="mt-2 text-sm break-words" style={{ color: 'var(--text-muted)' }}>
              {strings.noDeadlinesFound}
            </p>
          ) : (
            <ul
              className="mt-2.5 divide-y border-t"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              {displayDeadlines.map((item, idx) => (
                <li key={idx} className="py-2.5" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div
                    className="break-words text-xs font-semibold tabular-nums"
                    style={{ color: 'var(--risk-medium)' }}
                  >
                    {item.date}
                  </div>
                  <div className={`mt-0.5 break-words text-sm ${langConfig.fontClass}`}>
                    {item.what}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 4. Watch Outs */}
      {displayWatchOuts.length > 0 ? (
        <section className="space-y-2.5 py-5" style={{ borderColor: 'var(--border-hairline)' }}>
          <h3
            className={`font-serif-heading break-words text-lg font-medium ${langConfig.fontClass}`}
          >
            {strings.sectionWatchOuts}
          </h3>
          <ul className={`list-disc space-y-1.5 break-words pl-5 text-sm ${langConfig.fontClass}`}>
            {displayWatchOuts.map((item, idx) => (
              <li key={idx} className="break-words">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 5. Next Steps */}
      {displayNextSteps.length > 0 ? (
        <section className="space-y-2.5 py-5" style={{ borderColor: 'var(--border-hairline)' }}>
          <h3
            className={`font-serif-heading break-words text-lg font-medium ${langConfig.fontClass}`}
          >
            {strings.sectionNextSteps}
          </h3>
          <ol className={`list-decimal space-y-2 break-words pl-5 text-sm ${langConfig.fontClass}`}>
            {displayNextSteps.map((step, idx) => (
              <li key={idx} className="break-words">
                {step}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* 6. Draft Reply */}
      <section className="py-5" style={{ borderColor: 'var(--border-hairline)' }}>
        <DraftReplyBox
          draftReply={displayDraftReply}
          language={language}
          fontClass={langConfig.fontClass}
        />
      </section>

      {/* 7. Safe WhatsApp Share + Disclaimer */}
      <section className="space-y-3 py-5" style={{ borderColor: 'var(--border-hairline)' }}>
        <WhatsAppShare
          rawRedactedExplanation={explanation}
          vault={vault}
          language={language}
          note={strings.whatsappNote}
        />
        <p className="text-xs break-words" style={{ color: 'var(--text-muted)' }}>
          {strings.disclaimerText}
        </p>
      </section>
    </article>
  );
}
