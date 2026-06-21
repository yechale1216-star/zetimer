import { Router, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/tenant.middleware';

const router = Router();

// GET /api/notifications — fetch notifications for the authenticated user
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const notifications = await (prisma as any).userNotification.findMany({
      where: { userId, ...(schoolId ? { schoolId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n: any) => !n.isRead).length;

    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (error) { next(error); }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const notification = await (prisma as any).userNotification.findUnique({ where: { id: req.params.id } });
    if (!notification || notification.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updated = await (prisma as any).userNotification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    await (prisma as any).userNotification.updateMany({
      where: { userId, ...(schoolId ? { schoolId } : {}), isRead: false },
      data: { isRead: true },
    });

    res.status(200).json({ success: true });
  } catch (error) { next(error); }
});

// DELETE /api/notifications/:id — delete one notification
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const notification = await (prisma as any).userNotification.findUnique({ where: { id: req.params.id } });
    if (!notification || notification.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await (prisma as any).userNotification.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true });
  } catch (error) { next(error); }
});

// DELETE /api/notifications/clear-all — clear all notifications
router.delete('/clear-all', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    await (prisma as any).userNotification.deleteMany({
      where: { userId, ...(schoolId ? { schoolId } : {}) },
    });

    res.status(200).json({ success: true });
  } catch (error) { next(error); }
});

export default router;
