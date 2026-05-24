import { Router } from 'express';
import * as messageController from '../controllers/message.controller';

const router = Router();

router.get('/conversations/:userId', messageController.getConversations);
router.get('/messages/:conversationId', messageController.getMessages);
router.post('/conversations', messageController.createConversation);

export default router;
