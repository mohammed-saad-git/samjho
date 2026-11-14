'use client';

import { useRef, useState } from 'react';
import { Camera, FileText, Upload } from 'lucide-react';
import { getLanguageConfig, type LanguageCode } from '@/lib/i18n/languages';
import { UI_TRANSLATIONS } from '@/lib/i18n/translations';
import { SAMPLE_DOCUMENTS, type SampleDocumentInfo } from '@/lib/samples';

interface DocumentUploadProps {
  language: LanguageCode;
  isExtracting: boolean;
  extractionMessage: string;
  extractionProgress: number;
  extractionError: string | null;
  activeSampleId: string | null;
  onSelectFile: (file: File) => void;
  onSelectSample: (sample: SampleDocumentInfo) => void;
}

const ACCEPTED_MIME_OR_EXT = '.pdf,image/png,image/jpeg,image/webp';

export function DocumentUpload({
  language,
  isExtracting,
  extractionMessage,
  extractionProgress,
  extractionError,
  activeSampleId,
  onSelectFile,
  onSelectSample,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const langConfig = getLanguageConfig(language);
  const strings = UI_TRANSLATIONS[language];

  const handleFileChange = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    onSelectFile(file);
  };

  return (
    <section aria-labelledby="how-handled-heading" className={`space-y-6 ${langConfig.fontClass}`}>
      {/* Three-step handling strip directly on paper */}
      <div className="border-y py-4" style={{ borderColor: 'var(--border-hairline)' }}>
        <h2
          id="how-handled-heading"
          className="text-xs font-medium uppercase tracking-wider break-words"
          style={{ color: 'var(--text-muted)' }}
        >
          {strings.howHandledHeading}
        </h2>
        <ol className="mt-2.5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <li className="min-w-0">
            <p className="text-sm font-medium break-words">{strings.step1Title}</p>
            <p
              className="mt-0.5 text-xs leading-relaxed break-words"
              style={{ color: 'var(--text-muted)' }}
            >
              {strings.step1Body}
            </p>
          </li>
          <li className="min-w-0">
            <p className="text-sm font-medium break-words">{strings.step2Title}</p>
            <p
              className="mt-0.5 text-xs leading-relaxed break-words"
              style={{ color: 'var(--text-muted)' }}
            >
              {strings.step2Body}
            </p>
          </li>
          <li className="min-w-0">
            <p className="text-sm font-medium break-words">{strings.step3Title}</p>
            <p
              className="mt-0.5 text-xs leading-relaxed break-words"
              style={{ color: 'var(--text-muted)' }}
            >
              {strings.step3Body}
            </p>
          </li>
        </ol>
      </div>

      {/* Samples list (above dropzone on mobile, level on desktop) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 lg:col-span-7">
          <h2 id="samples-heading" className="font-serif-heading text-xl font-medium break-words">
            {strings.samplesHeading}
          </h2>

          <ul
            aria-labelledby="samples-heading"
            className="mt-3 divide-y border-y"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
            {SAMPLE_DOCUMENTS.map((sample) => {
              const isSelected = activeSampleId === sample.id;
              const copy = strings.samples[sample.id];
              return (
                <li key={sample.id} style={{ borderColor: 'var(--border-hairline)' }}>
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={() => onSelectSample(sample)}
                    aria-pressed={isSelected}
                    className="flex min-h-[44px] w-full flex-col items-start gap-1 px-2.5 py-3 text-left transition-colors hover:bg-[var(--bg-inset)] disabled:opacity-60"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--accent-protected-surface)'
                        : 'transparent',
                      borderLeft: isSelected
                        ? '3px solid var(--accent-protected)'
                        : '3px solid transparent',
                    }}
                  >
                    <div className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium break-words">
                        <FileText
                          className="h-3.5 w-3.5 shrink-0"
                          strokeWidth={1.5}
                          style={{
                            color: isSelected ? 'var(--accent-protected)' : 'var(--text-muted)',
                          }}
                          aria-hidden="true"
                        />
                        <span>{copy.title}</span>
                      </span>
                      <span className="text-xs break-words" style={{ color: 'var(--text-muted)' }}>
                        {copy.subtitle}
                      </span>
                    </div>
                    <p
                      className="text-xs leading-relaxed break-words"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {copy.identifiersSummary}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <h2 id="upload-heading" className="font-serif-heading text-xl font-medium break-words">
            {strings.uploadHeading}
          </h2>
          <p className="mt-1 text-sm break-words" style={{ color: 'var(--text-muted)' }}>
            {strings.uploadLead}
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!isExtracting) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (isExtracting) return;
              handleFileChange(e.dataTransfer.files);
            }}
            className="mt-3 rounded-[4px] border border-dashed p-5 text-center transition-colors"
            style={{
              borderColor: isDragging ? 'var(--accent-protected)' : 'var(--border-strong)',
              backgroundColor: isDragging ? 'var(--accent-protected-surface)' : 'var(--bg-surface)',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_MIME_OR_EXT}
              className="sr-only"
              aria-label={strings.chooseFileButton}
              onChange={(e) => {
                handleFileChange(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label={strings.takePhotoButton}
              onChange={(e) => {
                handleFileChange(e.target.files);
                e.target.value = '';
              }}
            />

            <p className="text-sm font-medium break-words">{strings.dropzonePrompt}</p>
            <p className="mt-1 text-xs break-words" style={{ color: 'var(--text-muted)' }}>
              {strings.dropzoneFormats}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={isExtracting}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--text-ink)',
                  color: 'var(--bg-paper)',
                }}
              >
                <Upload className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>{strings.chooseFileButton}</span>
              </button>

              <button
                type="button"
                disabled={isExtracting}
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
                style={{
                  borderColor: 'var(--border-strong)',
                  backgroundColor: 'var(--bg-paper)',
                  color: 'var(--text-ink)',
                }}
              >
                <Camera className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>{strings.takePhotoButton}</span>
              </button>
            </div>

            {isExtracting ? (
              <div className="mx-auto mt-4 max-w-md text-left" role="status" aria-live="polite">
                <div className="flex items-center justify-between gap-2 text-xs font-medium">
                  <span className="break-words">{extractionMessage}</span>
                  <span className="font-mono-code shrink-0">{extractionProgress}%</span>
                </div>
                <div
                  className="mt-1.5 h-2 w-full overflow-hidden rounded-[2px]"
                  style={{ backgroundColor: 'var(--border-hairline)' }}
                >
                  <div
                    className="h-full transition-all duration-200"
                    style={{
                      width: `${Math.max(5, extractionProgress)}%`,
                      backgroundColor: 'var(--accent-protected)',
                    }}
                  />
                </div>
              </div>
            ) : null}

            {extractionError ? (
              <div
                role="alert"
                className="mx-auto mt-4 max-w-lg rounded-[4px] border px-3 py-2.5 text-left text-sm break-words"
                style={{
                  borderColor: 'var(--risk-high)',
                  backgroundColor: 'var(--risk-high-surface)',
                  color: 'var(--risk-high)',
                }}
              >
                {extractionError}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
