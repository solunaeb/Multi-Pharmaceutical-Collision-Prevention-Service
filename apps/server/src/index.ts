import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { dataLoader } from './services/dataLoader.service';
import { tesseractOcrService } from './services/tesseractOcr.service';

const PORT = process.env.PORT || 3001;

// Load drug safety data into memory
dataLoader.load();

// Pre-initialize Tesseract worker (downloads language data on first run)
tesseractOcrService.initialize().catch((err) => {
  console.warn('[Server] Tesseract pre-init failed (will retry on first OCR request):', err);
});

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
});
