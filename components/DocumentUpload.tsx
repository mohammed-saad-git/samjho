'use client';

import { useRef, useState } from 'react';
import { Camera, FileText, Upload } from 'lucide-react';
import { SAMPLE_DOCUMENTS, type SampleDocumentInfo } from '@/lib/samples';

interface DocumentUploadProps {
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

  const handleFileChange = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    onSelectFile(file);
  };

  return (
    <section
      aria-labelledby="upload-heading"
      className="rounded-[6px] border p-4 sm:p-6"
      style={{
        borderColor: 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <h2 id="upload-heading" className="font-serif-heading text-xl font-medium">
            Open a letter, bill, or notice
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Upload a PDF or photo. Text extraction and identifier redaction run inside this browser
            before anything is sent.
          </p>
        </div>
      </div>

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
        className="mt-4 rounded-[4px] border border-dashed p-5 text-center transition-colors"
        style={{
          borderColor: isDragging ? 'var(--accent-protected)' : 'var(--border-strong)',
          backgroundColor: isDragging ? 'var(--accent-protected-surface)' : 'var(--bg-paper)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME_OR_EXT}
          className="sr-only"
          aria-label="Choose a PDF or image file from your device"
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
          aria-label="Take a photo of a document using your camera"
          onChange={(e) => {
            handleFileChange(e.target.files);
            e.target.value = '';
          }}
        />

        <p className="text-sm font-medium">
          Drop a PDF or document photo here, or choose from your device
        </p>
        <p className="mt-1 font-mono-code text-xs" style={{ color: 'var(--text-muted)' }}>
          Supported: digital or scanned PDF, PNG, JPG, WEBP
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
            <Upload className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            <span>Choose PDF or image</span>
          </button>

          <button
            type="button"
            disabled={isExtracting}
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
            style={{
              borderColor: 'var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-ink)',
            }}
          >
            <Camera className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            <span>Take a photo</span>
          </button>
        </div>

        {isExtracting ? (
          <div className="mx-auto mt-4 max-w-md text-left" role="status" aria-live="polite">
            <div className="flex items-center justify-between text-xs font-medium">
              <span>{extractionMessage}</span>
              <span className="font-mono-code">{extractionProgress}%</span>
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
            className="mx-auto mt-4 max-w-lg rounded-[4px] border px-3 py-2.5 text-left text-sm"
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

      <div className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <h3
            className="font-mono-code text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Or inspect a realistic sample document
          </h3>
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLE_DOCUMENTS.map((sample) => {
            const isSelected = activeSampleId === sample.id;
            return (
              <button
                key={sample.id}
                type="button"
                disabled={isExtracting}
                onClick={() => onSelectSample(sample)}
                aria-pressed={isSelected}
                className="flex min-h-[44px] flex-col items-start justify-center rounded-[4px] border px-3.5 py-2.5 text-left transition-colors disabled:opacity-60"
                style={{
                  borderColor: isSelected ? 'var(--accent-protected)' : 'var(--border-hairline)',
                  backgroundColor: isSelected
                    ? 'var(--accent-protected-surface)'
                    : 'var(--bg-paper)',
                }}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <FileText className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  <span>{sample.title}</span>
                </span>
                <span
                  className="mt-0.5 font-mono-code text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {sample.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
