'use client';

import * as Switch from '@radix-ui/react-switch';
import { Code2, RotateCcw } from 'lucide-react';
import {
  HEADER_LANGUAGE_ORDER,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '@/lib/i18n/languages';
import { UI_TRANSLATIONS } from '@/lib/i18n/translations';

interface HeaderProps {
  language: LanguageCode;
  onLanguageChange: (next: LanguageCode) => void;
  highContrast: boolean;
  onHighContrastChange: (next: boolean) => void;
  largeText: boolean;
  onLargeTextChange: (next: boolean) => void;
  hasDocument: boolean;
  onOpenInspector: () => void;
  onClearSession: () => void;
}

export function Header({
  language,
  onLanguageChange,
  highContrast,
  onHighContrastChange,
  largeText,
  onLargeTextChange,
  hasDocument,
  onOpenInspector,
  onClearSession,
}: HeaderProps) {
  const strings = UI_TRANSLATIONS[language];
  const currentLangConfig = SUPPORTED_LANGUAGES.find((l) => l.code === language);

  return (
    <header
      className="border-b"
      style={{
        borderColor: 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h1 className="font-serif-heading text-2xl font-medium tracking-tight">Samjho</h1>
              <span
                className={`text-xs font-medium uppercase tracking-wider break-words ${currentLangConfig?.fontClass ?? ''}`}
                style={{ color: 'var(--text-muted)' }}
              >
                {strings.appSubtitle}
              </span>
            </div>
            <p
              className={`mt-0.5 text-sm break-words ${currentLangConfig?.fontClass ?? ''}`}
              style={{ color: 'var(--text-muted)' }}
            >
              {strings.appTagline}
            </p>
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label={strings.languageSwitcherLabel}
          >
            {HEADER_LANGUAGE_ORDER.map((code) => {
              const lang = SUPPORTED_LANGUAGES.find((item) => item.code === code);
              if (!lang) return null;
              const active = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onLanguageChange(lang.code)}
                  aria-pressed={active}
                  className={`min-h-[44px] rounded-[4px] border px-3 py-1.5 text-sm font-medium transition-colors ${lang.fontClass}`}
                  style={{
                    borderColor: active ? 'var(--accent-protected)' : 'var(--border-hairline)',
                    backgroundColor: active ? 'var(--accent-protected)' : 'var(--bg-paper)',
                    color: active ? '#FFFFFF' : 'var(--text-ink)',
                  }}
                >
                  {lang.nativeName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="switch-high-contrast"
              className="flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-medium"
            >
              <span className={currentLangConfig?.fontClass ?? ''}>
                {strings.highContrastLabel}
              </span>
              <Switch.Root
                id="switch-high-contrast"
                checked={highContrast}
                onCheckedChange={onHighContrastChange}
                className="samjho-switch-root"
                aria-label={strings.highContrastLabel}
              >
                <Switch.Thumb className="samjho-switch-thumb" />
              </Switch.Root>
            </label>

            <label
              htmlFor="switch-large-text"
              className="flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-medium"
            >
              <span className={currentLangConfig?.fontClass ?? ''}>{strings.largeTextLabel}</span>
              <Switch.Root
                id="switch-large-text"
                checked={largeText}
                onCheckedChange={onLargeTextChange}
                className="samjho-switch-root"
                aria-label={strings.largeTextLabel}
              >
                <Switch.Thumb className="samjho-switch-thumb" />
              </Switch.Root>
            </label>
          </div>

          {hasDocument ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenInspector}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[4px] border px-3 text-xs font-medium transition-colors ${currentLangConfig?.fontClass ?? ''}`}
                style={{
                  borderColor: 'var(--border-hairline)',
                  backgroundColor: 'var(--bg-paper)',
                  color: 'var(--text-ink)',
                }}
              >
                <Code2 className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>{strings.inspectPayloadLabel}</span>
              </button>

              <button
                type="button"
                onClick={onClearSession}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[4px] border px-3 text-xs font-medium transition-colors ${currentLangConfig?.fontClass ?? ''}`}
                style={{
                  borderColor: 'var(--text-ink)',
                  backgroundColor: 'var(--text-ink)',
                  color: 'var(--bg-paper)',
                }}
              >
                <RotateCcw className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>{strings.clearSessionLabel}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
