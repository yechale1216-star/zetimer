import { Router } from 'express';
import * as parentController from '../controllers/parent.controller';

const router = Router();

// These routes are authenticated via tenantMiddleware
router.get('/', parentController.getAnnouncements);
router.post('/', parentController.postAnnouncement);
router.put('/:id', parentController.updateAnnouncement);

export default router;
