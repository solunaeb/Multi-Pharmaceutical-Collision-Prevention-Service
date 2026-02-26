import { Router } from 'express';
import { ocrController, ocrUpload } from '../controllers/ocr.controller';

const router = Router();

router.post('/api/v1/ocr/parse', ocrUpload, ocrController.parse);

export default router;
