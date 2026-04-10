'use client';

import { useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionResultItem;
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

/**
 * useLiveTranscript
 *
 * Uses the browser's Web Speech API (SpeechRecognition) to continuously
 * transcribe audio from HMS peers and POST each phrase to the transcript API.
 *
 * Requires: browser with Web Speech API support (Chrome, Edge — not Safari/Firefox).
 * Falls back gracefully if unavailable.
 */
export function useLiveTranscript(roomId: string, enabled: boolean) {
  const recognitionRef = useRef<{
    stop: () => void;
    start: () => void;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: { error?: string }) => void) | null;
    onend: (() => void) | null;
    continuous: boolean;
    interimResults: boolean;
    lang: string;
  } | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const transcriptCountRef = useRef(0);
  const pendingTextRef = useRef('');
  const segmentStartRef = useRef<string>(new Date().toISOString());

  const postSegment = useCallback(
    async (text: string, speakerName: string, speakerRole: string) => {
      if (!text.trim()) return;

      try {
        await fetch('/api/fishbowlz/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            speakerName,
            speakerRole,
            text: text.trim(),
            startedAt: segmentStartRef.current,
            source: 'manual',
          }),
        });
        transcriptCountRef.current++;
      } catch {
        // Non-critical — transcript will be missing
      }
    },
    [roomId]
  );

  useEffect(() => {
    if (!enabled) return;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Web Speech API not supported in this browser');
      return;
    }

    const win = window as Window & {
      SpeechRecognition?: new () => {
        stop: () => void;
        start: () => void;
        onresult: ((event: SpeechRecognitionEventLike) => void) | null;
        onerror: ((event: { error?: string }) => void) | null;
        onend: (() => void) | null;
        continuous: boolean;
        interimResults: boolean;
        lang: string;
      };
      webkitSpeechRecognition?: new () => {
        stop: () => void;
        start: () => void;
        onresult: ((event: SpeechRecognitionEventLike) => void) | null;
        onerror: ((event: { error?: string }) => void) | null;
        onend: (() => void) | null;
        continuous: boolean;
        interimResults: boolean;
        lang: string;
      };
    };
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = async (event: SpeechRecognitionEventLike) => {
      const results = Array.from(event.results);

      for (const result of results) {
        const transcript = result[0]?.transcript?.trim() ?? '';
        if (!transcript) continue;

        const isFinal = result.isFinal;

        if (isFinal) {
          // Finalized phrase — post to transcript API
          const fullText = pendingTextRef.current + ' ' + transcript;
          pendingTextRef.current = '';
          segmentStartRef.current = new Date().toISOString();

          // Use generic "Speaker" since Web Speech API doesn't always identify who spoke
          await postSegment(fullText, 'Speaker', 'speaker');
          lastTranscriptRef.current = fullText;
        } else {
          // Interim — accumulate
          pendingTextRef.current = transcript;
        }
      }
    };

    recognition.onerror = (event: { error?: string }) => {
      if (event.error === 'no-speech') return;
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      // Restart if still enabled
      if (recognitionRef.current && enabled) {
        try {
          recognition.start();
        } catch {
          // Already running
        }
      }
    };

    recognition.start();

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [enabled, postSegment]);

  return {
    transcriptCount: transcriptCountRef.current,
    isListening: !!recognitionRef.current,
  };
}
