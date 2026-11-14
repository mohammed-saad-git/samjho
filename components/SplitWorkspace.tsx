'use client';

import * as Tabs from '@radix-ui/react-tabs';
import type { Finding } from '@/lib/detect';

export interface ManualSpan {
  start: number;
  end: number;
  text: string;
}

interface SplitWorkspaceProps {
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

function renderPlainTokens(
  text: string,
  baseOffset: number,
  onToggleManualWord: (span: ManualSpan) => void
) {
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
        <button
          key={`w-${start}-${idx}`}
          type="button"
          onClick={() => onToggleManualWord({ start, end, text: piece })}
          title={`Click to redact "${piece}"`}
          className="inline cursor-pointer rounded-[2px] px-[1px] text-left transition-colors hover:bg-[var(--bg-inset)]"
        >
          {piece}
        </button>
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
  originalText,
  redactedText,
  allAutoFindings,
  activeFindings,
  disabledFindingIds,
  manualSpans,
  onToggleAutoFinding,
  onToggleManualWord,
}: SplitWorkspaceProps) {
  const segments = buildSegments(
    originalText,
    allAutoFindings,
    activeFindings,
    disabledFindingIds,
    manualSpans
  );

  let barSequence = 0;

  const originalPane = (
    <div
      className="flex h-full flex-col rounded-[6px] border"
      style={{
        borderColor: 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div
        className="flex items-center justify-between gap-2 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <h3 className="text-sm font-medium">Original document (click any word to toggle)</h3>
        <span className="font-mono-code text-xs" style={{ color: 'var(--text-muted)' }}>
          stays on device
        </span>
      </div>
      <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words p-4 text-sm leading-7">
        {segments.map((seg, idx) => {
          if (seg.kind === 'plain') {
            return (
              <span key={`p-${seg.start}-${idx}`}>
                {renderPlainTokens(seg.text, seg.start, onToggleManualWord)}
              </span>
            );
          }

          if (seg.kind === 'manual') {
            const delayMs = Math.min(barSequence++, 24) * 25;
            return (
              <button
                key={`m-${seg.start}-${idx}`}
                type="button"
                onClick={() => onToggleManualWord(seg.span)}
                style={{ animationDelay: `${delayMs}ms` }}
                className="redaction-bar mx-0.5"
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
                onClick={() => onToggleAutoFinding(seg.finding.id)}
                style={{ animationDelay: `${delayMs}ms` }}
                className="redaction-bar mx-0.5"
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
              onClick={() => onToggleAutoFinding(seg.finding.id)}
              className="redaction-bar-disabled mx-0.5"
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
      className="flex h-full flex-col rounded-[6px] border"
      style={{
        borderColor: 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div
        className="flex items-center justify-between gap-2 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <h3 className="text-sm font-medium">What the AI will see</h3>
        <span className="font-mono-code text-xs" style={{ color: 'var(--accent-protected)' }}>
          {redactedText.length.toLocaleString()} chars
        </span>
      </div>
      <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words p-4 font-mono-code text-[0.82rem] leading-7">
        {renderRedactedPreview(redactedText)}
      </div>
    </div>
  );

  return (
    <section aria-label="Split comparison of original and redacted document">
      {/* Mobile (<768px): Radix Tabs */}
      <div className="md:hidden">
        <Tabs.Root defaultValue="original">
          <Tabs.List
            className="mb-3 grid grid-cols-2 rounded-[4px] border p-1"
            style={{
              borderColor: 'var(--border-hairline)',
              backgroundColor: 'var(--bg-surface)',
            }}
            aria-label="Document view"
          >
            <Tabs.Trigger
              value="original"
              className="min-h-[44px] rounded-[3px] px-2 text-xs font-medium data-[state=active]:bg-[var(--text-ink)] data-[state=active]:text-[var(--bg-paper)]"
            >
              Original (tap to edit)
            </Tabs.Trigger>
            <Tabs.Trigger
              value="redacted"
              className="min-h-[44px] rounded-[3px] px-2 text-xs font-medium data-[state=active]:bg-[var(--text-ink)] data-[state=active]:text-[var(--bg-paper)]"
            >
              What the AI will see
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
