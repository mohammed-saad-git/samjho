'use client';

import { extractTextFromImage, type ExtractionProgress } from './ocr';

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  method: 'pdf-text' | 'pdf-ocr';
}

interface PositionedSpan {
  str: string;
  x: number;
  y: number;
  width: number;
}

function reconstructPageLines(items: unknown[]): string {
  const spans: PositionedSpan[] = [];

  for (const item of items) {
    if (
      typeof item === 'object' &&
      item !== null &&
      'str' in item &&
      'transform' in item &&
      typeof (item as { str: unknown }).str === 'string' &&
      Array.isArray((item as { transform: unknown }).transform)
    ) {
      const typed = item as { str: string; transform: number[]; width?: number };
      const text = typed.str;
      if (!text.trim()) continue;
      const x = typed.transform[4] ?? 0;
      const y = typed.transform[5] ?? 0;
      spans.push({
        str: text,
        x,
        y,
        width: typed.width ?? 0,
      });
    }
  }

  if (spans.length === 0) return '';

  // Sort top-to-bottom (higher y first in PDF coordinate space), then left-to-right
  spans.sort((a, b) => {
    if (Math.abs(b.y - a.y) > 3.5) {
      return b.y - a.y;
    }
    return a.x - b.x;
  });

  const lines: PositionedSpan[][] = [];
  for (const span of spans) {
    const lastLine = lines[lines.length - 1];
    const anchor = lastLine?.[0];
    if (lastLine && anchor && Math.abs(anchor.y - span.y) <= 3.5) {
      lastLine.push(span);
    } else {
      lines.push([span]);
    }
  }

  return lines
    .map((line) => {
      line.sort((a, b) => a.x - b.x);
      let joined = '';
      let prevEnd = -Infinity;
      for (const span of line) {
        if (joined.length > 0 && span.x - prevEnd > 2 && !joined.endsWith(' ')) {
          joined += ' ';
        }
        joined += span.str;
        prevEnd = span.x + span.width;
      }
      return joined.trim();
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Extracts text from a PDF in the browser using pdfjs-dist.
 * Falls back to on-device OCR if the PDF contains only scanned page images.
 */
export async function extractTextFromPdf(
  file: Blob,
  onProgress?: (
    update: ExtractionProgress | { stage: 'reading-pdf'; progress: number; message: string }
  ) => void
): Promise<PdfExtractionResult> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  onProgress?.({
    stage: 'reading-pdf',
    progress: 15,
    message: 'Reading PDF pages on this device…',
  });

  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];
  const totalPages = pdf.numPages;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = reconstructPageLines(content.items);
    if (pageText) {
      pageTexts.push(pageText);
    }
    onProgress?.({
      stage: 'reading-pdf',
      progress: Math.round(15 + (pageNum / Math.max(1, totalPages)) * 75),
      message: `Reading page ${pageNum} of ${totalPages}…`,
    });
  }

  const combined = pageTexts.join('\n\n').trim();
  if (combined.length >= 25) {
    onProgress?.({
      stage: 'reading-pdf',
      progress: 100,
      message: 'PDF text extracted on device.',
    });
    return {
      text: combined,
      pageCount: totalPages,
      method: 'pdf-text',
    };
  }

  // Scanned PDF fallback: render up to first 2 pages to canvas and run OCR locally
  if (typeof document === 'undefined' || totalPages === 0) {
    throw new Error(
      'This PDF did not contain readable text. Try uploading a clear photo of the page.'
    );
  }

  const ocrParts: string[] = [];
  const pagesToOcr = Math.min(totalPages, 2);
  for (let pageNum = 1; pageNum <= pagesToOcr; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) continue;

    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const ocrResult = await extractTextFromImage(canvas, onProgress);
    ocrParts.push(ocrResult.text);
  }

  const fallbackText = ocrParts.join('\n\n').trim();
  if (fallbackText.length < 25) {
    throw new Error('We could not read this PDF. Try uploading a sharper scan or clear photo.');
  }

  return {
    text: fallbackText,
    pageCount: totalPages,
    method: 'pdf-ocr',
  };
}
