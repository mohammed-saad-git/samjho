'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { LanguageCode } from '@/lib/i18n/languages';
import { UI_TRANSLATIONS } from '@/lib/i18n/translations';

interface DraftReplyBoxProps {
  draftReply: string;
  language: LanguageCode;
  fontClass: string;
}

export function DraftReplyBox({ draftReply, language, fontClass }: DraftReplyBoxProps) {
  const [copied, setCopied] = useState(false);
  const strings = UI_TRANSLATIONS[language];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftReply);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif-heading text-lg font-medium">{strings.sectionDraftReply}</h3>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] border px-3.5 py-2 text-xs font-medium transition-colors"
          style={{
            borderColor: copied ? 'var(--accent-protected)' : 'var(--border-strong)',
            backgroundColor: copied ? 'var(--accent-protected-surface)' : 'var(--bg-paper)',
            color: copied ? 'var(--accent-protected)' : 'var(--text-ink)',
          }}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>{strings.copiedReplyLabel}</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>{strings.copyReplyLabel}</span>
            </>
          )}
        </button>
      </div>

      <pre
        className={`overflow-x-auto whitespace-pre-wrap rounded-[4px] border p-4 text-sm leading-relaxed ${fontClass}`}
        style={{
          borderColor: 'var(--border-hairline)',
          backgroundColor: 'var(--bg-paper)',
          color: 'var(--text-ink)',
        }}
      >
        {draftReply}
      </pre>
    </div>
  );
}
