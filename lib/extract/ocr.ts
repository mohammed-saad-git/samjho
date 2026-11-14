'use client';

export interface ExtractionProgress {
  stage: 'loading-ocr' | 'recognizing';
  progress: number; // 0 to 100
  message: string;
}

export interface ExtractionResult {
  text: string;
  method: 'ocr';
  confidence: number;
}

const UNREADABLE_PHOTO_MESSAGE =
  'We could not read this photo. Try again in better light, with the page flat.';

/**
 * Extracts text from an image File, Blob, or Canvas in a browser Web Worker using Tesseract.js.
 * Language data ('eng') is lazy-loaded only when an image requires OCR.
 */
export async function extractTextFromImage(
  image: File | Blob | HTMLCanvasElement,
  onProgress?: (update: ExtractionProgress) => void
): Promise<ExtractionResult> {
  const { createWorker } = await import('tesseract.js');

  onProgress?.({
    stage: 'loading-ocr',
    progress: 5,
    message: 'Loading on-device OCR reader…',
  });

  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const pct = Math.max(10, Math.min(99, Math.round(m.progress * 100)));
        onProgress?.({
          stage: 'recognizing',
          progress: pct,
          message: `Reading text on this device (${pct}%)…`,
        });
      }
    },
  });

  try {
    const result = await worker.recognize(image);
    const cleaned = result.data.text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (cleaned.length < 25 || result.data.confidence < 25) {
      throw new Error(UNREADABLE_PHOTO_MESSAGE);
    }

    onProgress?.({
      stage: 'recognizing',
      progress: 100,
      message: 'Text extracted on device.',
    });

    return {
      text: cleaned,
      method: 'ocr',
      confidence: result.data.confidence,
    };
  } catch (err) {
    if (err instanceof Error && err.message === UNREADABLE_PHOTO_MESSAGE) {
      throw err;
    }
    throw new Error(UNREADABLE_PHOTO_MESSAGE);
  } finally {
    await worker.terminate();
  }
}
