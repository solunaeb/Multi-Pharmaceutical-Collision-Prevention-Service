import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';

const router = Router();

router.get('/api/v1/profiles', profileController.list);
router.get('/api/v1/profiles/:id', profileController.getById);
router.post('/api/v1/profiles', profileController.create);
router.patch('/api/v1/profiles/:id', profileController.update);
router.delete('/api/v1/profiles/:id', profileController.remove);

export default router;
