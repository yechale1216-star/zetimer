import { Router } from 'express';
import * as parentController from '../controllers/parent.controller';

const router = Router();

// Authentication / Verification
router.post('/login', parentController.loginParent);
router.post('/update-password', parentController.updatePassword);
router.get('/search', parentController.searchParent);

// Notifications & Announcements
router.get('/notifications/:phone', parentController.getNotifications);
router.patch('/notifications/:id/read', parentController.markAsRead);
router.patch('/notifications/read-all/:phone', parentController.markAllAsRead);

// Announcements Publisher (Admins/Teachers or test suite)
router.post('/announcements', parentController.postAnnouncement);

// Preferences
router.get('/preferences/:phone', parentController.getPreferences);
router.put('/preferences/:phone', parentController.updatePreferences);

export default router;
