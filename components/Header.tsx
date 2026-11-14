'use client';

import * as Switch from '@radix-ui/react-switch';
import { Code2, RotateCcw } from 'lucide-react';

interface HeaderProps {
  highContrast: boolean;
  onHighContrastChange: (next: boolean) => void;
  largeText: boolean;
  onLargeTextChange: (next: boolean) => void;
  hasDocument: boolean;
  onOpenInspector: () => void;
  onClearSession: () => void;
}

export function Header({
  highContrast,
  onHighContrastChange,
  largeText,
  onLargeTextChange,
  hasDocument,
  onOpenInspector,
  onClearSession,
}: HeaderProps) {
  return (
    <header
      className="border-b"
      style={{
        borderColor: 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-serif-heading text-2xl font-medium tracking-tight">Samjho</h1>
            <span
              className="font-mono-code text-xs uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Document Reader
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Plain-language explanations for official paperwork. Identifiers never leave your device.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <label
            htmlFor="switch-high-contrast"
            className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[4px] border px-2.5 text-xs font-medium"
            style={{
              borderColor: 'var(--border-hairline)',
              backgroundColor: 'var(--bg-paper)',
            }}
          >
            <span>High contrast</span>
            <Switch.Root
              id="switch-high-contrast"
              checked={highContrast}
              onCheckedChange={onHighContrastChange}
              className="samjho-switch-root"
              aria-label="Toggle high contrast mode"
            >
              <Switch.Thumb className="samjho-switch-thumb" />
            </Switch.Root>
          </label>

          <label
            htmlFor="switch-large-text"
            className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[4px] border px-2.5 text-xs font-medium"
            style={{
              borderColor: 'var(--border-hairline)',
              backgroundColor: 'var(--bg-paper)',
            }}
          >
            <span>Large text</span>
            <Switch.Root
              id="switch-large-text"
              checked={largeText}
              onCheckedChange={onLargeTextChange}
              className="samjho-switch-root"
              aria-label="Toggle large text mode"
            >
              <Switch.Thumb className="samjho-switch-thumb" />
            </Switch.Root>
          </label>

          {hasDocument ? (
            <>
              <button
                type="button"
                onClick={onOpenInspector}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[4px] border px-3 text-xs font-medium transition-colors"
                style={{
                  borderColor: 'var(--border-hairline)',
                  backgroundColor: 'var(--bg-paper)',
                  color: 'var(--text-ink)',
                }}
              >
                <Code2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>Inspect payload</span>
              </button>

              <button
                type="button"
                onClick={onClearSession}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[4px] border px-3 text-xs font-medium transition-colors"
                style={{
                  borderColor: 'var(--text-ink)',
                  backgroundColor: 'var(--text-ink)',
                  color: 'var(--bg-paper)',
                }}
              >
                <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>Clear session</span>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
