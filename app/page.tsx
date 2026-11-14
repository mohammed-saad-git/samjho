'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { DocumentUpload } from '@/components/DocumentUpload';
import { ExplanationResults } from '@/components/ExplanationResults';
import { FindingsTable } from '@/components/FindingsTable';
import { Header } from '@/components/Header';
import { PrivacyScoreBar } from '@/components/PrivacyScoreBar';
import { RequestInspectorModal } from '@/components/RequestInspectorModal';
import { SplitWorkspace, type ManualSpan } from '@/components/SplitWorkspace';
import { detectPII, redactDocument, SessionVault } from '@/lib/detect';
import { extractTextFromImage } from '@/lib/extract/ocr';
import { extractTextFromPdf } from '@/lib/extract/pdf';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/lib/i18n/languages';
import { ExplainResponseSchema, type ExplainResponse } from '@/lib/llm/schema';
import { getPreGeneratedSampleResponse, type SampleDocumentInfo } from '@/lib/samples';

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export default function HomePage() {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState('');
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const [documentName, setDocumentName] = useState<string | null>(null);
  const [documentHint, setDocumentHint] = useState<string | undefined>(undefined);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState('');
  const [scanKey, setScanKey] = useState(0);

  const [disabledFindingIds, setDisabledFindingIds] = useState<Set<string>>(() => new Set());
  const [manualSpans, setManualSpans] = useState<ManualSpan[]>([]);

  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('en');
  const [hasSentToServer, setHasSentToServer] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [resultSource, setResultSource] = useState<'sample' | 'live'>('live');
  const [showRealDetails, setShowRealDetails] = useState(true);

  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Sync high-contrast and large-text attributes onto <html>
  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.setAttribute('data-contrast', 'high');
    } else {
      root.removeAttribute('data-contrast');
    }
    if (largeText) {
      root.setAttribute('data-text-size', 'large');
    } else {
      root.removeAttribute('data-text-size');
    }
  }, [highContrast, largeText]);

  const derived = useMemo(() => {
    if (!originalText) return null;
    const sessionVault = new SessionVault();
    const autoFindings = detectPII(originalText, sessionVault);
    const redactionState = redactDocument(
      originalText,
      sessionVault,
      disabledFindingIds,
      manualSpans
    );
    return {
      vault: sessionVault,
      autoFindings,
      redactionState,
    };
  }, [originalText, disabledFindingIds, manualSpans]);

  // Wipe in-memory vault on page unload or document replacement
  useEffect(() => {
    const wipeVault = () => {
      derived?.vault.clear();
    };
    window.addEventListener('beforeunload', wipeVault);
    window.addEventListener('pagehide', wipeVault);
    return () => {
      window.removeEventListener('beforeunload', wipeVault);
      window.removeEventListener('pagehide', wipeVault);
      wipeVault();
    };
  }, [derived]);

  const allAutoFindings = derived?.autoFindings ?? [];
  const redactionState = derived?.redactionState ?? null;

  const loadExtractedText = useCallback(
    (text: string, meta: { name: string; hint?: string; sampleId: string | null }) => {
      setDisabledFindingIds(new Set());
      setManualSpans([]);
      setExplanation(null);
      setExplainError(null);
      setHasSentToServer(false);
      setDocumentName(meta.name);
      setDocumentHint(meta.hint);
      setActiveSampleId(meta.sampleId);
      setOriginalText(text);
      setScanKey((prev) => prev + 1);

      const previewVault = new SessionVault();
      const preview = redactDocument(text, previewVault);
      previewVault.clear();
      setLiveAnnouncement(
        `Scan complete for ${meta.name}. ${preview.findings.length} identifiers masked on this device. Privacy score improved from ${preview.beforeScore.score} to ${preview.afterScore.score}.`
      );
    },
    []
  );

  const processBlob = useCallback(
    async (
      blob: Blob,
      meta: { name: string; mimeType: string; hint?: string; sampleId: string | null }
    ) => {
      setIsExtracting(true);
      setExtractionError(null);
      setExtractionProgress(5);
      setExtractionMessage('Preparing on-device reader…');

      try {
        if (blob.size > MAX_FILE_BYTES) {
          throw new Error('This file is larger than 15 MB. Please upload a smaller PDF or photo.');
        }

        const isPdf =
          meta.mimeType === 'application/pdf' || meta.name.toLowerCase().endsWith('.pdf');
        const isImage =
          meta.mimeType.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(meta.name);

        if (!isPdf && !isImage) {
          throw new Error('Unsupported file format. Please upload a PDF, PNG, JPG, or WEBP file.');
        }

        const extractedText = isPdf
          ? (
              await extractTextFromPdf(blob, (u) => {
                setExtractionProgress(u.progress);
                setExtractionMessage(u.message);
              })
            ).text
          : (
              await extractTextFromImage(blob, (u) => {
                setExtractionProgress(u.progress);
                setExtractionMessage(u.message);
              })
            ).text;

        loadExtractedText(extractedText, {
          name: meta.name,
          hint: meta.hint,
          sampleId: meta.sampleId,
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Could not read text from this file. Try a clearer copy.';
        setExtractionError(message);
        setLiveAnnouncement(message);
      } finally {
        setIsExtracting(false);
      }
    },
    [loadExtractedText]
  );

  const handleSelectFile = (file: File) => {
    void processBlob(file, {
      name: file.name,
      mimeType: file.type,
      sampleId: null,
    });
  };

  const handleSelectSample = async (sample: SampleDocumentInfo) => {
    setIsExtracting(true);
    setExtractionError(null);
    setExtractionProgress(5);
    setExtractionMessage('Loading sample document locally…');

    try {
      const response = await fetch(sample.fileUrl);
      if (!response.ok) {
        throw new Error('Could not load the sample document file.');
      }
      const blob = await response.blob();
      await processBlob(blob, {
        name: sample.title,
        mimeType: sample.kind === 'pdf' ? 'application/pdf' : 'image/png',
        hint: sample.documentHint,
        sampleId: sample.id,
      });
    } catch (err) {
      setIsExtracting(false);
      setExtractionError(err instanceof Error ? err.message : 'Failed to load sample document.');
    }
  };

  const handleToggleAutoFinding = (findingId: string) => {
    setDisabledFindingIds((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  };

  const handleToggleManualWord = (span: ManualSpan) => {
    setManualSpans((prev) => {
      const exists = prev.some((item) => item.start === span.start && item.end === span.end);
      if (exists) {
        return prev.filter((item) => !(item.start === span.start && item.end === span.end));
      }
      return [...prev, span];
    });
  };

  const hasModifiedRedactions = disabledFindingIds.size > 0 || manualSpans.length > 0;

  const runExplanation = useCallback(
    async (lang: LanguageCode, forceLive = false) => {
      if (!redactionState) return;
      setExplainError(null);

      // Sample fast-path unless the user modified redactions or explicitly requested live AI
      if (activeSampleId && !hasModifiedRedactions && !forceLive) {
        const pregen = getPreGeneratedSampleResponse(activeSampleId, lang);
        if (pregen) {
          setExplanation(pregen);
          setResultSource('sample');
          setLiveAnnouncement(`Loaded pre-generated explanation in ${lang}.`);
          return;
        }
      }

      setIsExplaining(true);
      setHasSentToServer(true);

      try {
        const response = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            redactedText: redactionState.redactedText,
            targetLanguage: lang,
            ...(documentHint ? { documentHint } : {}),
          }),
        });

        const body = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? 'Could not explain this document right now.');
        }

        const validated = ExplainResponseSchema.parse(body);
        setExplanation(validated);
        setResultSource('live');
        setLiveAnnouncement(`Explanation ready in ${lang}.`);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to reach the explanation service. Please retry.';
        setExplainError(message);
        setLiveAnnouncement(message);
      } finally {
        setIsExplaining(false);
      }
    },
    [redactionState, activeSampleId, hasModifiedRedactions, documentHint]
  );

  const handleLanguageChange = (nextLang: LanguageCode) => {
    setTargetLanguage(nextLang);
    if (explanation) {
      void runExplanation(nextLang, resultSource === 'live' && !activeSampleId);
    }
  };

  const handleClearSession = () => {
    derived?.vault.clear();
    setOriginalText('');
    setDocumentName(null);
    setDocumentHint(undefined);
    setActiveSampleId(null);
    setDisabledFindingIds(new Set());
    setManualSpans([]);
    setExplanation(null);
    setExplainError(null);
    setExtractionError(null);
    setHasSentToServer(false);
    setInspectorOpen(false);
    setLiveAnnouncement('Session cleared. All local identifiers were wiped from memory.');
  };

  const selectedLangConfig = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        highContrast={highContrast}
        onHighContrastChange={setHighContrast}
        largeText={largeText}
        onLargeTextChange={setLargeText}
        hasDocument={Boolean(originalText)}
        onOpenInspector={() => setInspectorOpen(true)}
        onClearSession={handleClearSession}
      />

      <div className="sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        <DocumentUpload
          isExtracting={isExtracting}
          extractionMessage={extractionMessage}
          extractionProgress={extractionProgress}
          extractionError={extractionError}
          activeSampleId={activeSampleId}
          onSelectFile={handleSelectFile}
          onSelectSample={handleSelectSample}
        />

        {redactionState ? (
          <>
            <PrivacyScoreBar
              beforeScore={redactionState.beforeScore}
              afterScore={redactionState.afterScore}
              findings={redactionState.findings}
              hasSentToServer={hasSentToServer}
              scanKey={scanKey}
            />

            <SplitWorkspace
              originalText={redactionState.originalText}
              redactedText={redactionState.redactedText}
              allAutoFindings={allAutoFindings}
              activeFindings={redactionState.findings}
              disabledFindingIds={disabledFindingIds}
              manualSpans={manualSpans}
              onToggleAutoFinding={handleToggleAutoFinding}
              onToggleManualWord={handleToggleManualWord}
            />

            <FindingsTable findings={redactionState.findings} />

            {/* Language choice + Confirm action */}
            <section
              aria-labelledby="explain-controls-heading"
              className="rounded-[6px] border p-4 sm:p-6"
              style={{
                borderColor: 'var(--border-hairline)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <h2 id="explain-controls-heading" className="text-sm font-medium">
                    Choose explanation language
                  </h2>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Target language">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const active = lang.code === targetLanguage;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleLanguageChange(lang.code)}
                          aria-pressed={active}
                          className={`min-h-[44px] rounded-[4px] border px-3.5 py-2 text-sm font-medium transition-colors ${lang.fontClass}`}
                          style={{
                            borderColor: active
                              ? 'var(--accent-protected)'
                              : 'var(--border-hairline)',
                            backgroundColor: active ? 'var(--accent-protected)' : 'var(--bg-paper)',
                            color: active ? '#FFFFFF' : 'var(--text-ink)',
                          }}
                        >
                          {lang.nativeName}
                          {lang.code !== 'en' ? (
                            <span className="ml-1.5 text-xs opacity-80">{lang.englishName}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isExplaining}
                    onClick={() => void runExplanation(targetLanguage)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] px-5 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
                    style={{
                      backgroundColor: 'var(--accent-protected)',
                      color: '#FFFFFF',
                    }}
                  >
                    <span>
                      {isExplaining
                        ? 'Explaining document…'
                        : `Confirm & explain in ${selectedLangConfig?.englishName ?? 'English'}`}
                    </span>
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {explainError ? (
                <div
                  role="alert"
                  className="mt-4 flex flex-col gap-3 rounded-[4px] border p-3.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    borderColor: 'var(--risk-high)',
                    backgroundColor: 'var(--risk-high-surface)',
                    color: 'var(--risk-high)',
                  }}
                >
                  <span>{explainError}</span>
                  <button
                    type="button"
                    onClick={() => void runExplanation(targetLanguage, true)}
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-[4px] border px-3.5 py-1.5 text-xs font-medium"
                    style={{
                      borderColor: 'var(--risk-high)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--risk-high)',
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                    <span>Retry</span>
                  </button>
                </div>
              ) : null}
            </section>

            {explanation && derived ? (
              <ExplanationResults
                explanation={explanation}
                vault={derived.vault}
                language={targetLanguage}
                showRealDetails={showRealDetails}
                onShowRealDetailsChange={setShowRealDetails}
                sourceKind={resultSource}
                isLoadingLive={isExplaining}
                onRequestLiveRun={() => void runExplanation(targetLanguage, true)}
              />
            ) : null}
          </>
        ) : null}

        {redactionState ? (
          <RequestInspectorModal
            open={inspectorOpen}
            onOpenChange={setInspectorOpen}
            redactedText={redactionState.redactedText}
            targetLanguage={targetLanguage}
            documentHint={documentHint}
          />
        ) : null}
      </main>

      <footer
        className="border-t px-4 py-4 text-xs sm:px-6"
        style={{
          borderColor: 'var(--border-hairline)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <span>
            Samjho · Identifiers stay in browser memory for this session only (
            {documentName ?? 'no document loaded'}).
          </span>
          <span className="font-mono-code">No localStorage · No analytics · No tracking</span>
        </div>
      </footer>
    </div>
  );
}
