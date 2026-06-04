import { Request, Response, NextFunction } from 'express';
import * as parentService from '../services/parent.service';
import { AuthenticatedRequest } from '../middleware/tenant.middleware';

export const loginParent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: "Phone and password are required." });
    }
    const result = await parentService.loginParent(phone, password);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to login." });
  }
};

export const searchParent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ success: false, message: "Phone query parameter is required." });
    }
    const result = await parentService.searchParentByPhone(phone, schoolId);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to search parent." });
  }
};

export const updatePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { phone, currentPassword, newPassword } = req.body;
    if (!phone || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Phone, current password, and new password are required." });
    }
    const result = await parentService.updatePassword(phone, currentPassword, newPassword, schoolId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to update password." });
  }
};

export const getNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { phone } = req.params;
    const notifications = await parentService.getNotifications(phone, schoolId);
    res.status(200).json({ success: true, data: notifications });
  } catch (error: any) {
    next(error);
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    await parentService.markNotificationAsRead(id, schoolId);
    res.status(200).json({ success: true, message: "Notification marked as read." });
  } catch (error: any) {
    next(error);
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    await parentService.deleteNotification(id, schoolId);
    res.status(200).json({ success: true, message: "Notification deleted." });
  } catch (error: any) {
    next(error);
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { phone } = req.params;
    await parentService.markAllNotificationsAsRead(phone, schoolId);
    res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (error: any) {
    next(error);
  }
};

export const getPreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { phone } = req.params;
    const preferences = await parentService.getPreferences(phone, schoolId);
    res.status(200).json({ success: true, data: preferences });
  } catch (error: any) {
    next(error);
  }
};

export const updatePreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { phone } = req.params;
    const preferences = await parentService.updatePreferences(phone, schoolId, req.body);
    res.status(200).json({ success: true, data: preferences, message: "Preferences updated successfully." });
  } catch (error: any) {
    next(error);
  }
};

export const postAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const announcement = await parentService.postAnnouncement(schoolId, req.body);
    res.status(201).json({ success: true, data: announcement, message: "Announcement published." });
  } catch (error: any) {
    next(error);
  }
};
