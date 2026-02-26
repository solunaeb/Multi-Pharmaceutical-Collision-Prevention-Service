import { Router } from 'express';
import { medicationController } from '../controllers/medication.controller';

const router = Router();

router.get('/api/v1/meds/:profileId', medicationController.list);
router.post('/api/v1/meds/:profileId', medicationController.register);
router.delete('/api/v1/meds/:profileId/:medId', medicationController.deactivate);

export default router;
