import { Router } from 'express';
import * as callController from '../controllers/call.controller';

const router = Router();

router.post('/log', callController.logCall);
router.get('/history', callController.getCallHistory);

export default router;
