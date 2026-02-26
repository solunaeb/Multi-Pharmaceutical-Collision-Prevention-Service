import Tesseract from 'tesseract.js';

let worker: Tesseract.Worker | null = null;
let initializing = false;
let initPromise: Promise<void> | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (worker) return worker;

  if (initializing && initPromise) {
    await initPromise;
    return worker!;
  }

  initializing = true;
  initPromise = (async () => {
    console.log('[TesseractOCR] Initializing worker (kor+eng)...');
    const start = Date.now();
    worker = await Tesseract.createWorker('kor+eng');
    console.log(`[TesseractOCR] Worker ready in ${Date.now() - start}ms`);
  })();

  await initPromise;
  initializing = false;
  return worker!;
}

export interface TesseractResult {
  text: string;
  confidence: number;
}

export const tesseractOcrService = {
  async initialize(): Promise<void> {
    await getWorker();
  },

  async recognizeText(imageBuffer: Buffer): Promise<TesseractResult> {
    const w = await getWorker();
    const { data } = await w.recognize(imageBuffer);
    return {
      text: data.text,
      confidence: data.confidence / 100, // Tesseract returns 0-100, normalize to 0-1
    };
  },
};
