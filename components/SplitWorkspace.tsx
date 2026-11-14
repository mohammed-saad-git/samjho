'use client';

import type { MouseEvent } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { Finding } from '@/lib/detect';
import { getLanguageConfig, type LanguageCode } from '@/lib/i18n/languages';
import { UI_TRANSLATIONS } from '@/lib/i18n/translations';

export interface ManualSpan {
  start: number;
  end: number;
  text: string;
}

interface SplitWorkspaceProps {
  language: LanguageCode;
  originalText: string;
  redactedText: string;
  allAutoFindings: readonly Finding[];
  activeFindings: readonly Finding[];
  disabledFindingIds: ReadonlySet<string>;
  manualSpans: readonly ManualSpan[];
  onToggleAutoFinding: (findingId: string) => void;
  onToggleManualWord: (span: ManualSpan) => void;
}

type Segment =
  | {
      kind: 'auto';
      start: number;
      end: number;
      finding: Finding;
      active: boolean;
    }
  | {
      kind: 'manual';
      start: number;
      end: number;
      span: ManualSpan;
      token: string;
    }
  | {
      kind: 'plain';
      start: number;
      end: number;
      text: string;
    };

function buildSegments(
  originalText: string,
  allAutoFindings: readonly Finding[],
  activeFindings: readonly Finding[],
  disabledFindingIds: ReadonlySet<string>,
  manualSpans: readonly ManualSpan[]
): Segment[] {
  const tokenBySpanKey = new Map<string, string>();
  for (const f of activeFindings) {
    tokenBySpanKey.set(`${f.start}:${f.end}`, f.token);
  }

  type Interval =
    | { kind: 'auto'; start: number; end: number; finding: Finding; active: boolean }
    | { kind: 'manual'; start: number; end: number; span: ManualSpan; token: string };

  const intervals: Interval[] = [];

  for (const finding of allAutoFindings) {
    intervals.push({
      kind: 'auto',
      start: finding.start,
      end: finding.end,
      finding,
      active: !disabledFindingIds.has(finding.id),
    });
  }

  for (const span of manualSpans) {
    const overlapsActiveAuto = intervals.some(
      (i) => i.kind === 'auto' && i.active && span.start < i.end && span.end > i.start
    );
    if (!overlapsActiveAuto) {
      intervals.push({
        kind: 'manual',
        start: span.start,
        end: span.end,
        span,
        token: tokenBySpanKey.get(`${span.start}:${span.end}`) ?? '[REDACTED]',
      });
    }
  }

  intervals.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const item of intervals) {
    if (item.start < cursor) continue;
    if (item.start > cursor) {
      segments.push({
        kind: 'plain',
        start: cursor,
        end: item.start,
        text: originalText.slice(cursor, item.start),
      });
    }
    segments.push(item);
    cursor = item.end;
  }

  if (cursor < originalText.length) {
    segments.push({
      kind: 'plain',
      start: cursor,
      end: originalText.length,
      text: originalText.slice(cursor),
    });
  }

  return segments;
}

function renderPlainTokens(text: string, baseOffset: number) {
  const parts: React.ReactNode[] = [];
  const regex = /(\S+|\s+)/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    const piece = match[0];
    const start = baseOffset + match.index;
    const end = start + piece.length;

    if (/^\s+$/.test(piece)) {
      parts.push(<span key={`ws-${start}-${idx}`}>{piece}</span>);
    } else {
      parts.push(
        <span
          key={`w-${start}-${idx}`}
          data-manual-start={start}
          data-manual-end={end}
          data-manual-text={piece}
          title={`Click to redact "${piece}"`}
          className="cursor-pointer rounded-[2px] px-[1px] transition-colors hover:bg-[var(--bg-inset)]"
        >
          {piece}
        </span>
      );
    }
    idx += 1;
  }

  return parts;
}

function renderRedactedPreview(redactedText: string) {
  const tokenRegex = /(\[[A-Z]+_\d{2,3}\])/g;
  const parts = redactedText.split(tokenRegex);

  return parts.map((part, idx) => {
    if (/^\[[A-Z]+_\d{2,3}\]$/.test(part)) {
      return (
        <span
          key={`tok-${idx}`}
          className="mx-0.5 inline-block rounded-[3px] px-1.5 py-0.5 font-mono-code text-[0.78em] font-medium"
          style={{
            backgroundColor: 'var(--accent-protected-surface)',
            color: 'var(--accent-protected)',
            border: '1px solid var(--accent-protected)',
          }}
        >
          {part}
        </span>
      );
    }
    return <span key={`txt-${idx}`}>{part}</span>;
  });
}

export function SplitWorkspace({
  language,
  originalText,
  redactedText,
  allAutoFindings,
  activeFindings,
  disabledFindingIds,
  manualSpans,
  onToggleAutoFinding,
  onToggleManualWord,
}: SplitWorkspaceProps) {
  const langConfig = getLanguageConfig(language);
  const strings = UI_TRANSLATIONS[language];

  const segments = buildSegments(
    originalText,
    allAutoFindings,
    activeFindings,
    disabledFindingIds,
    manualSpans
  );

  const handleOriginalTextClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const wordEl = target?.closest<HTMLElement>('[data-manual-start]');
    if (!wordEl) return;

    const startAttr = wordEl.getAttribute('data-manual-start');
    const endAttr = wordEl.getAttribute('data-manual-end');
    const textAttr = wordEl.getAttribute('data-manual-text');
    if (startAttr === null || endAttr === null || textAttr === null) return;

    const start = Number(startAttr);
    const end = Number(endAttr);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;

    onToggleManualWord({ start, end, text: textAttr });
  };

  let barSequence = 0;

  const originalPane = (
    <div
      className="flex h-full flex-col rounded-[4px] border"
      style={{
        borderColor: 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <h3 className={`text-sm font-medium break-words ${langConfig.fontClass}`}>
          {strings.originalPaneTitle}
        </h3>
        <span
          className={`text-xs break-words ${langConfig.fontClass}`}
          style={{ color: 'var(--text-muted)' }}
        >
          {strings.staysOnDeviceLabel}
        </span>
      </div>
      <div
        onClick={handleOriginalTextClick}
        className="max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words p-4 text-sm leading-8"
      >
        {segments.map((seg, idx) => {
          if (seg.kind === 'plain') {
            return (
              <span key={`p-${seg.start}-${idx}`}>{renderPlainTokens(seg.text, seg.start)}</span>
            );
          }

          if (seg.kind === 'manual') {
            const delayMs = Math.min(barSequence++, 24) * 25;
            return (
              <button
                key={`m-${seg.start}-${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleManualWord(seg.span);
                }}
                style={{ animationDelay: `${delayMs}ms` }}
                className="redaction-bar mx-0.5 my-0.5"
                title={`Manually redacted: "${seg.span.text}". Click to restore.`}
                aria-label={`Manually redacted ${seg.span.text} as ${seg.token}. Click to restore.`}
              >
                {seg.token}
              </button>
            );
          }

          if (seg.active) {
            const delayMs = Math.min(barSequence++, 24) * 25;
            return (
              <button
                key={`a-${seg.finding.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAutoFinding(seg.finding.id);
                }}
                style={{ animationDelay: `${delayMs}ms` }}
                className="redaction-bar mx-0.5 my-0.5"
                title={`Redacted ${seg.finding.category}: "${seg.finding.text}". Click to include in AI request.`}
                aria-label={`Redacted ${seg.finding.category} as ${seg.finding.token}. Click to toggle.`}
              >
                {seg.finding.token}
              </button>
            );
          }

          return (
            <button
              key={`d-${seg.finding.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleAutoFinding(seg.finding.id);
              }}
              className="redaction-bar-disabled mx-0.5 my-0.5"
              title={`Unredacted ${seg.finding.category}. Click to redact again.`}
              aria-label={`Unredacted ${seg.finding.text}. Click to redact.`}
            >
              {seg.finding.text}
            </button>
          );
        })}
      </div>
    </div>
  );

  const redactedPane = (
    <div
      className="flex h-full flex-col rounded-[4px] border"
      style={{
        borderColor: 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <h3 className={`text-sm font-medium break-words ${langConfig.fontClass}`}>
          {strings.redactedPaneTitle}
        </h3>
        <span className="font-mono-code text-xs" style={{ color: 'var(--accent-protected)' }}>
          {redactedText.length.toLocaleString()} {strings.charsSuffix}
        </span>
      </div>
      <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words p-4 text-sm leading-8">
        {renderRedactedPreview(redactedText)}
      </div>
    </div>
  );

  return (
    <section aria-label={strings.redactedPaneTitle}>
      {/* Mobile (<768px): flat underline Tabs above active pane */}
      <div className="md:hidden">
        <Tabs.Root defaultValue="original">
          <Tabs.List
            className="mb-3 flex border-b"
            style={{ borderColor: 'var(--border-hairline)' }}
            aria-label={strings.redactedPaneTitle}
          >
            <Tabs.Trigger
              value="original"
              className={`min-h-[44px] flex-1 border-b-2 border-transparent px-3 py-2 text-xs font-medium data-[state=active]:border-[var(--accent-protected)] data-[state=active]:text-[var(--accent-protected)] ${langConfig.fontClass}`}
            >
              {strings.mobileTabOriginal}
            </Tabs.Trigger>
            <Tabs.Trigger
              value="redacted"
              className={`min-h-[44px] flex-1 border-b-2 border-transparent px-3 py-2 text-xs font-medium data-[state=active]:border-[var(--accent-protected)] data-[state=active]:text-[var(--accent-protected)] ${langConfig.fontClass}`}
            >
              {strings.mobileTabRedacted}
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="original">{originalPane}</Tabs.Content>
          <Tabs.Content value="redacted">{redactedPane}</Tabs.Content>
        </Tabs.Root>
      </div>

      {/* Desktop (>=768px): Side-by-side split view */}
      <div className="hidden gap-4 md:grid md:grid-cols-2">
        {originalPane}
        {redactedPane}
      </div>
    </section>
  );
}
