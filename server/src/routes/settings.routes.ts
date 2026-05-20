import { Router, Request, Response, NextFunction } from 'express';
import * as settingsService from '../services/settings.service';

const router = Router();

// Get settings for a school
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    if (!schoolId) return res.status(400).json({ success: false, message: 'x-school-id header required' });
    const settings = await settingsService.getSettings(schoolId);
    res.status(200).json({ success: true, data: settings });
  } catch (error) { next(error); }
});

// Update settings for a school
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    if (!schoolId) return res.status(400).json({ success: false, message: 'x-school-id header required' });
    const settings = await settingsService.updateSettings(schoolId, req.body);
    res.status(200).json({ success: true, data: settings });
  } catch (error) { next(error); }
});

export default router;
