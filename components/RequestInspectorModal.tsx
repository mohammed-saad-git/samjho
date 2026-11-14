'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { detectPII } from '@/lib/detect';
import type { LanguageCode } from '@/lib/i18n/languages';

interface RequestInspectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redactedText: string;
  targetLanguage: LanguageCode;
  documentHint?: string;
}

export function RequestInspectorModal({
  open,
  onOpenChange,
  redactedText,
  targetLanguage,
  documentHint,
}: RequestInspectorModalProps) {
  const payload = {
    redactedText,
    targetLanguage,
    ...(documentHint ? { documentHint } : {}),
  };

  const jsonPreview = JSON.stringify(payload, null, 2);
  const serverGuardFindings = detectPII(redactedText).filter((f) =>
    ['AADHAAR', 'PAN', 'PHONE', 'EMAIL'].includes(f.category)
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(20, 19, 15, 0.55)' }}
        />
        <Dialog.Content
          aria-describedby="inspector-desc"
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-[6px] border"
          style={{
            borderColor: 'var(--text-ink)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-ink)',
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3 sm:px-5"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
            <Dialog.Title className="font-serif-heading text-lg font-medium">
              Outbound AI Request Inspector
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-[4px] border"
                style={{
                  borderColor: 'var(--border-hairline)',
                  backgroundColor: 'var(--bg-paper)',
                }}
                aria-label="Close request inspector"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-3 overflow-y-auto p-4 sm:p-5">
            <p id="inspector-desc" className="text-sm" style={{ color: 'var(--text-muted)' }}>
              This exact JSON body is what leaves your browser to{' '}
              <code className="font-mono-code">POST /api/explain</code>. Your local vault mapping
              never leaves memory.
            </p>

            <div className="flex flex-wrap items-center gap-2 font-mono-code text-xs">
              <span
                className="rounded-[3px] border px-2 py-1"
                style={{
                  borderColor: 'var(--border-hairline)',
                  backgroundColor: 'var(--bg-paper)',
                }}
              >
                {redactedText.length.toLocaleString()} / 20,000 chars
              </span>
              <span
                className="rounded-[3px] border px-2 py-1"
                style={{
                  borderColor:
                    serverGuardFindings.length === 0
                      ? 'var(--accent-protected)'
                      : 'var(--risk-high)',
                  backgroundColor:
                    serverGuardFindings.length === 0
                      ? 'var(--accent-protected-surface)'
                      : 'var(--risk-high-surface)',
                  color:
                    serverGuardFindings.length === 0
                      ? 'var(--accent-protected)'
                      : 'var(--risk-high)',
                }}
              >
                Server 422 guard:{' '}
                {serverGuardFindings.length === 0
                  ? 'PASS (0 Aadhaar/PAN/Phone/Email found)'
                  : `BLOCKED (${serverGuardFindings.length} leaked identifier)`}
              </span>
            </div>

            <pre
              className="max-h-[45vh] overflow-auto rounded-[4px] border p-3.5 font-mono-code text-xs leading-relaxed"
              style={{
                borderColor: 'var(--border-hairline)',
                backgroundColor: 'var(--bg-paper)',
              }}
            >
              {jsonPreview}
            </pre>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
