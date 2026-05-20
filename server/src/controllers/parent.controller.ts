import { Request, Response, NextFunction } from 'express';
import * as parentService from '../services/parent.service';

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

export const searchParent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ success: false, message: "Phone query parameter is required." });
    }
    const result = await parentService.searchParentByPhone(phone);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to search parent." });
  }
};

export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, currentPassword, newPassword } = req.body;
    if (!phone || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Phone, current password, and new password are required." });
    }
    const result = await parentService.updatePassword(phone, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to update password." });
  }
};

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.params;
    const notifications = await parentService.getNotifications(phone);
    res.status(200).json({ success: true, data: notifications });
  } catch (error: any) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await parentService.markNotificationAsRead(id);
    res.status(200).json({ success: true, message: "Notification marked as read." });
  } catch (error: any) {
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.params;
    await parentService.markAllNotificationsAsRead(phone);
    res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (error: any) {
    next(error);
  }
};

export const getPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.params;
    const preferences = await parentService.getPreferences(phone);
    res.status(200).json({ success: true, data: preferences });
  } catch (error: any) {
    next(error);
  }
};

export const updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.params;
    const preferences = await parentService.updatePreferences(phone, req.body);
    res.status(200).json({ success: true, data: preferences, message: "Preferences updated successfully." });
  } catch (error: any) {
    next(error);
  }
};

export const postAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string || "Main School";
    const announcement = await parentService.postAnnouncement(schoolId, req.body);
    res.status(201).json({ success: true, data: announcement, message: "Announcement published." });
  } catch (error: any) {
    next(error);
  }
};
