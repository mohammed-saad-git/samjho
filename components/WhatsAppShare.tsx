'use client';

import { Share2 } from 'lucide-react';
import type { SessionVault } from '@/lib/detect';
import type { LanguageCode } from '@/lib/i18n/languages';
import { UI_TRANSLATIONS } from '@/lib/i18n/translations';
import type { ExplainResponse } from '@/lib/llm/schema';
import { buildWhatsAppShareUrl } from '@/lib/share';

interface WhatsAppShareProps {
  rawRedactedExplanation: ExplainResponse;
  vault: SessionVault;
  language: LanguageCode;
  note?: string;
}

export function WhatsAppShare({
  rawRedactedExplanation,
  vault,
  language,
  note,
}: WhatsAppShareProps) {
  const strings = UI_TRANSLATIONS[language];
  const shareHref = buildWhatsAppShareUrl(rawRedactedExplanation, vault);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <a
        href={shareHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[4px] border px-4 py-2 text-sm font-medium transition-colors"
        style={{
          borderColor: 'var(--accent-protected)',
          backgroundColor: 'var(--accent-protected-surface)',
          color: 'var(--accent-protected)',
        }}
      >
        <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <span>{strings.shareWhatsappLabel}</span>
      </a>
      <p className="text-xs break-words" style={{ color: 'var(--text-muted)' }}>
        {note ?? strings.whatsappNote}
      </p>
    </div>
  );
}
