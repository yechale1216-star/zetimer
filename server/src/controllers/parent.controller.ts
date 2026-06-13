import { Request, Response, NextFunction } from 'express';
import * as parentService from '../services/parent.service';
import { AuthenticatedRequest } from '../middleware/tenant.middleware';

export const listParentSchools = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ success: false, message: "Phone is required." });
    }
    const normalizedPhone = parentService.normalizePhoneNumber(phone);
    const result = await parentService.listParentSchools(normalizedPhone);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to list schools." });
  }
};

export const loginParent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password, schoolId } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: "Phone and password are required." });
    }
    const normalizedPhone = parentService.normalizePhoneNumber(phone);
    const result = await parentService.loginParent(normalizedPhone, password, schoolId);
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
    const schoolId = (req.headers['x-school-id'] as string) || req.user?.schoolId;
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
    const schoolId = (req.headers['x-school-id'] as string) || req.user?.schoolId;
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
    const schoolId = (req.headers['x-school-id'] as string) || req.user?.schoolId;
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
    const schoolId = (req.headers['x-school-id'] as string) || req.user?.schoolId;
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
    const schoolId = (req.headers['x-school-id'] as string) || req.user?.schoolId;
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
    const schoolId = (req.headers['x-school-id'] as string) || req.user?.schoolId;
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
    const schoolId = (req.headers['x-school-id'] as string) || req.user?.schoolId;
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

export const getAnnouncements = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const announcements = await parentService.getSchoolAnnouncements(schoolId);
    res.status(200).json({ success: true, data: announcements });
  } catch (error: any) {
    next(error);
  }
};

export const updateAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const announcement = await parentService.updateAnnouncement(id, schoolId, req.body);
    res.status(200).json({ success: true, data: announcement, message: "Announcement updated." });
  } catch (error: any) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = (req.headers['x-school-id'] as string) || req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { phone } = req.params;
    const { name, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }

    const result = await parentService.updateProfile(phone, schoolId, { name, email, address });
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to update profile." });
  }
};

/**
 * GET /api/parent/me/schools
 * Returns all schools this parent has children in — server validated.
 */
export const getMySchools = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const schools = await parentService.getParentSchools(req.user.id);
    res.status(200).json({ success: true, data: schools });
  } catch (error: any) {
    next(error);
  }
};

/**
 * POST /api/parent/me/active-school
 * Validates the parent owns a child in the requested school, then returns school info.
 */
export const setActiveSchool = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { schoolId } = req.body;
    if (!schoolId) return res.status(400).json({ success: false, message: 'schoolId is required.' });

    const hasAccess = await parentService.validateSchoolAccess(req.user.id, schoolId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'You do not have a child enrolled in this school.' });
    }

    // Return the school details for the frontend to update context
    const schools = await parentService.getParentSchools(req.user.id);
    const school = schools.find((s: any) => s.id === schoolId);
    res.status(200).json({ success: true, data: school });
  } catch (error: any) {
    next(error);
  }
};

export const checkParentsBatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { phones } = req.body;
    if (!Array.isArray(phones)) {
      return res.status(400).json({ success: false, message: "Phones must be an array." });
    }
    const existenceMap = await parentService.checkParentsExist(phones);
    res.status(200).json({ success: true, data: existenceMap });
  } catch (error: any) {
    next(error);
  }
};
