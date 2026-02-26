import { Router } from 'express';
import { analysisController } from '../controllers/analysis.controller';

const router = Router();

router.post('/api/v1/analysis/check-interaction', analysisController.checkInteraction);
router.get('/api/v1/analysis/log/:logId', analysisController.getLog);
router.get('/api/v1/analysis/history/:profileId', analysisController.history);

export default router;
