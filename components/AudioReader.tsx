'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { getLanguageConfig, type LanguageCode } from '@/lib/i18n/languages';
import { UI_TRANSLATIONS } from '@/lib/i18n/translations';

interface AudioReaderProps {
  text: string;
  language: LanguageCode;
}

interface TextToken {
  text: string;
  start: number;
  end: number;
  isSpace: boolean;
}

function tokenizeForBoundary(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  const regex = /(\S+|\s+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      isSpace: /^\s+$/.test(match[0]),
    });
  }
  return tokens;
}

export function AudioReader({ text, language }: AudioReaderProps) {
  const langConfig = getLanguageConfig(language);
  const strings = UI_TRANSLATIONS[language];

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesChecked, setVoicesChecked] = useState(() => !isSupported);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [boundarySupported, setBoundarySupported] = useState(false);
  const [activeCharIndex, setActiveCharIndex] = useState<number>(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      if (available.length > 0) {
        setVoicesChecked(true);
      }
    };

    const initTimer = window.setTimeout(loadVoices, 0);
    const fallbackTimer = window.setTimeout(() => setVoicesChecked(true), 500);
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.clearTimeout(initTimer);
      window.clearTimeout(fallbackTimer);
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [text, language]);

  const matchedVoice = useMemo(() => {
    if (voices.length === 0) return null;
    for (const prefix of langConfig.speechPrefixes) {
      const found = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      if (found) return found;
    }
    return null;
  }, [voices, langConfig.speechPrefixes]);

  const tokens = useMemo(() => tokenizeForBoundary(text), [text]);

  const stopSpeech = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
    setActiveCharIndex(-1);
  };

  const startSpeech = () => {
    if (!isSupported || !matchedVoice) return;
    window.speechSynthesis.cancel();
    setBoundarySupported(false);
    setActiveCharIndex(-1);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = matchedVoice;
    utterance.lang = matchedVoice.lang || langConfig.speechLang;
    utterance.rate = 0.95;

    utterance.onboundary = (event) => {
      if (event.name === 'word' || typeof event.charIndex === 'number') {
        setBoundarySupported(true);
        setActiveCharIndex(event.charIndex);
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setActiveCharIndex(-1);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setActiveCharIndex(-1);
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const voiceMissing = !isSupported || (voicesChecked && !matchedVoice);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {!voiceMissing ? (
          <button
            type="button"
            onClick={isSpeaking ? stopSpeech : startSpeech}
            disabled={!matchedVoice}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              borderColor: isSpeaking ? 'var(--accent-protected)' : 'var(--border-strong)',
              backgroundColor: isSpeaking ? 'var(--accent-protected-surface)' : 'var(--bg-paper)',
              color: isSpeaking ? 'var(--accent-protected)' : 'var(--text-ink)',
            }}
          >
            {isSpeaking ? (
              <>
                <Square className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>{strings.stopAudioLabel}</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>{strings.listenLabel}</span>
              </>
            )}
          </button>
        ) : null}

        {matchedVoice ? (
          <span className="font-mono-code text-xs" style={{ color: 'var(--text-muted)' }}>
            Voice: {matchedVoice.name} ({matchedVoice.lang})
          </span>
        ) : null}
      </div>

      {voiceMissing ? (
        <p
          role="status"
          className="rounded-[4px] border px-3 py-2 text-xs"
          style={{
            borderColor: 'var(--border-hairline)',
            backgroundColor: 'var(--bg-paper)',
            color: 'var(--text-muted)',
          }}
        >
          {strings.voiceUnavailable}
        </p>
      ) : null}

      <p className={`text-base leading-relaxed ${langConfig.fontClass}`}>
        {isSpeaking && boundarySupported && activeCharIndex >= 0
          ? tokens.map((tok, i) => {
              const isHighlighted =
                !tok.isSpace && activeCharIndex >= tok.start && activeCharIndex < tok.end;
              if (!isHighlighted) {
                return <span key={i}>{tok.text}</span>;
              }
              return (
                <mark
                  key={i}
                  className="rounded-[2px] px-0.5"
                  style={{
                    backgroundColor: 'var(--accent-protected-surface)',
                    color: 'var(--accent-protected)',
                  }}
                >
                  {tok.text}
                </mark>
              );
            })
          : text}
      </p>
    </div>
  );
}
