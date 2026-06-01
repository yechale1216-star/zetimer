import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { authorize } from '../middleware/tenant.middleware';

const router = Router();

router.get('/conversations/:userId', messageController.getConversations);
router.get('/:conversationId', messageController.getMessages);
router.post('/conversations', messageController.createConversation);

export default router;
